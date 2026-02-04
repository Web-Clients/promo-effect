
import { BookingsService } from '../src/modules/bookings/bookings.service';
import prisma from '../src/lib/prisma';

async function main() {
    console.log('--- Agent Role Verification ---');

    const bookingsService = new BookingsService();
    const testId = Date.now().toString();

    try {
        // 1. Create a dummy client
        console.log('Creating test client...');
        const client = await prisma.client.create({
            data: {
                email: `client_${testId}@test.com`,
                companyName: 'Test Client',
                contactPerson: 'Test Client Person',
                phone: '123456789',
                status: 'ACTIVE'
            }
        });

        // 2. Create another client (noise)
        const client2 = await prisma.client.create({
            data: {
                email: `client2_${testId}@test.com`,
                companyName: 'Test Client 2',
                contactPerson: 'Test Client Person 2',
                phone: '987654321',
                status: 'ACTIVE'
            }
        });

        // 3. Create a test Agent User
        console.log('Creating test agent...');
        const agentUser = await prisma.user.create({
            data: {
                email: `agent_${testId}@test.com`,
                passwordHash: 'dummy',
                name: 'Test Agent',
                role: 'AGENT',
            }
        });

        // 4. Create an Agent profile for this user
        const agentProfile = await prisma.agent.create({
            data: {
                userId: agentUser.id,
                agentCode: `AG-${testId}`,
                company: 'Test Agent Co',
                contactName: 'Agent Man',
                createdById: agentUser.id // Self-created for test
            }
        });


        // 5. Create Booking 1 (Assigned to Agent)
        console.log('Creating booking assigned to agent...');
        const bookingAssigned = await prisma.booking.create({
            data: {
                id: `BK_AG_${testId}`,
                clientId: client.id,
                agentId: agentProfile.id,
                status: 'CONFIRMED',
                portOrigin: 'Origin',
                portDestination: 'Dest',
                containerType: '20ft',
                shippingLine: 'MSC',
                freightPrice: 1000,
                portTaxes: 100,
                customsTaxes: 100,
                terrestrialTransport: 100,
                commission: 100,
                totalPrice: 1400,
                cargoCategory: 'General',
                cargoWeight: '1000',
                cargoReadyDate: new Date(),
            }
        });

        // 6. Create Booking 2 (Not assigned to Agent)
        console.log('Creating booking NOT assigned to agent...');
        const bookingUnassigned = await prisma.booking.create({
            data: {
                id: `BK_NO_${testId}`,
                clientId: client2.id,
                status: 'CONFIRMED',
                portOrigin: 'Origin',
                portDestination: 'Dest',
                containerType: '20ft',
                shippingLine: 'MSC',
                freightPrice: 1000,
                portTaxes: 100,
                customsTaxes: 100,
                terrestrialTransport: 100,
                commission: 100,
                totalPrice: 1400,
                cargoCategory: 'General',
                cargoWeight: '1000',
                cargoReadyDate: new Date(),
            }
        });

        // 7. Call findAll as Agent
        console.log('Fetching bookings as Agent...');
        const result = await bookingsService.findAll({}, agentUser.id, 'AGENT');

        console.log(`Total bookings found: ${result.bookings.length}`);
        const foundIds = result.bookings.map(b => b.id);
        console.log('Found Booking Ids:', foundIds);

        const sawAssigned = foundIds.includes(bookingAssigned.id);
        const sawUnassigned = foundIds.includes(bookingUnassigned.id);

        console.log(`Saw assigned booking: ${sawAssigned}`);
        console.log(`Saw unassigned booking: ${sawUnassigned}`);

        if (sawUnassigned) {
            console.error('FAIL: Agent can see bookings not assigned to them!');
        } else {
            console.log('PASS: Agent saw only relevant bookings.');
        }

    } catch (e) {
        console.error('Error:', e);
    } finally {
        // Cleanup
        console.log('Cleaning up...');
        try {
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
