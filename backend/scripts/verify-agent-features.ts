
import { BookingsService } from '../src/modules/bookings/bookings.service';
import prisma from '../src/lib/prisma';
import { storageService } from '../src/services/storage.service';

// Mock storage service to avoid real uploads
storageService.uploadFile = async () => 'http://mock-storage.com/file.pdf';

async function main() {
    console.log('--- Agent Features Verification ---');

    const bookingsService = new BookingsService();
    const testId = Date.now().toString();

    try {
        // 1. Create a dummy client
        console.log('Creating test user & agent...');
        const user = await prisma.user.create({
            data: {
                email: `agent_feat_${testId}@test.com`,
                passwordHash: 'dummy',
                name: 'Test Agent Feature',
                role: 'AGENT',
            }
        });

        const agent = await prisma.agent.create({
            data: {
                userId: user.id,
                agentCode: `AGF-${testId}`,
                company: 'Agent Features Co',
                contactName: 'Agent Features',
                createdById: user.id
            }
        });

        // 2. Create User for Client (to receive confirmation email)
        const clientUser = await prisma.user.create({
            data: {
                email: `client_feat_${testId}@test.com`,
                passwordHash: 'dummy',
                name: 'Client Feat',
                role: 'CLIENT',
            }
        });

        const client = await prisma.client.create({
            data: {
                email: clientUser.email,
                companyName: 'Client Feat',
                contactPerson: 'Client Feat',
                phone: '111',
                status: 'ACTIVE'
            }
        });

        // 3. Create a Booking assigned to Agent using Service (to trigger notifications)
        console.log('Creating booking via Service...');
        const booking = await bookingsService.create({
            portOrigin: 'Origin',
            portDestination: 'Dest',
            containerType: '20ft',
            cargoCategory: 'General',
            cargoWeight: '1000',
            cargoReadyDate: new Date().toISOString(),
            clientId: client.id,
            agentId: agent.id,
            freightPrice: 1000,
            shippingLine: 'MSC',
        }, clientUser.id);

        console.log(`Booking created: ${booking.id}`);

        // 4. Test Status Update
        console.log('Testing Status Update by Agent...');
        await bookingsService.update(booking.id, { status: 'IN_TRANSIT' }, user.id, 'AGENT');

        const updatedBooking = await prisma.booking.findUnique({ where: { id: booking.id } });
        if (updatedBooking?.status === 'IN_TRANSIT') {
            console.log('PASS: Agent updated status successfully.');
        } else {
            console.error(`FAIL: Status mismatch. Expected IN_TRANSIT, got ${updatedBooking?.status}`);
        }

        // 4. Test Document Upload (Mocked)
        console.log('Testing Document Upload by Agent...');
        const mockFile = {
            fieldname: 'file',
            originalname: 'test_doc.pdf',
            encoding: '7bit',
            mimetype: 'application/pdf',
            buffer: Buffer.from('test content'),
            size: 100,
        } as any; // Cast as any because we don't need full Express.Multer.File properties

        const doc = await bookingsService.addDocument(booking.id, mockFile, user.id, 'AGENT');

        if (doc && doc.fileName === 'test_doc.pdf') {
            console.log('PASS: Agent added document successfully.');
        } else {
            console.error('FAIL: Document not created.', doc);
        }

    } catch (e) {
        console.error('Error:', e);
    } finally {
        // Cleanup
        console.log('Cleaning up...');
        try {
            await prisma.document.deleteMany({ where: { fileName: { contains: 'test_doc.pdf' } } });
            await prisma.booking.deleteMany({ where: { id: { contains: testId } } });
            await prisma.agent.deleteMany({ where: { agentCode: { contains: testId } } });
            await prisma.user.deleteMany({ where: { email: { contains: testId } } });
            await prisma.client.deleteMany({ where: { email: { contains: testId } } });
        } catch (err) {
            console.error('Cleanup failed:', err);
        }
        await prisma.$disconnect();
    }
}

main();
