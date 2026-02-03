import prisma from '../../lib/prisma';
import { generateBookingId } from '../../utils/booking-id.util';
import { CreateBookingDTO, UpdateBookingDTO, BookingFilters } from '../../types/booking.types';
import notificationService from '../../services/notification.service';

export class BookingsService {
  /**
   * Get or create a Client record for a User
   * This bridges the User and Client tables for booking creation
   */
  private async getOrCreateClientForUser(userId: string): Promise<string> {
    // First, get the user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Check if a Client already exists with this email
    let client = await prisma.client.findUnique({
      where: { email: user.email },
    });

    // If no client exists, create one based on User data
    if (!client) {
      client = await prisma.client.create({
        data: {
          email: user.email,
          companyName: user.company || user.name,
          contactPerson: user.name,
          phone: user.phone || '',
          status: 'ACTIVE',
        },
      });
    }

    return client.id;
  }

  /**
   * Create new booking with automatic price calculation
   */
  async create(data: CreateBookingDTO, userId: string) {
    // 1. Generate unique booking ID (PE2512001)
    const id = await generateBookingId();

    // 2. Get admin settings for fixed costs
    const settings = await prisma.adminSettings.findUnique({ where: { id: 1 } });
    if (!settings) {
      throw new Error('Admin settings not configured');
    }

    // 3. Resolve clientId - use provided clientId, or create/get Client for the current user
    let clientId = data.clientId;
    if (!clientId) {
      clientId = await this.getOrCreateClientForUser(userId);
    }

    // 4. Find best price from AgentPrice table (if agent/price specified)
    let freightPrice = data.freightPrice || 0;
    let shippingLine = data.shippingLine || 'TBD';
    let agentId = data.agentId;
    let priceId = data.priceId;

    if (priceId) {
      const selectedPrice = await prisma.agentPrice.findUnique({
        where: { id: priceId },
        include: { agent: true }
      });

      if (!selectedPrice) {
        throw new Error('Selected price not found');
      }

      freightPrice = selectedPrice.freightPrice;
      shippingLine = selectedPrice.shippingLine;
      agentId = selectedPrice.agentId || undefined;
    }

    // 5. Calculate total price
    const portTaxes = settings.portTaxes;
    const customsTaxes = settings.customsTaxes;
    const terrestrialTransport = settings.terrestrialTransport;
    const commission = settings.commission;
    const totalPrice = freightPrice + portTaxes + customsTaxes + terrestrialTransport + commission;

    // 6. Create booking
    const booking = await prisma.booking.create({
      data: {
        id,
        clientId, // Now properly resolved to a Client ID
        agentId,
        priceId,

        // Route
        portOrigin: data.portOrigin,
        portDestination: data.portDestination || 'Constanta',
        containerType: data.containerType,

        // Cargo details
        cargoCategory: data.cargoCategory,
        cargoWeight: data.cargoWeight,
        cargoReadyDate: new Date(data.cargoReadyDate),

        // Pricing breakdown
        shippingLine,
        freightPrice,
        portTaxes,
        customsTaxes,
        terrestrialTransport,
        commission,
        totalPrice,

        // Supplier info (optional)
        supplierName: data.supplierName,
        supplierPhone: data.supplierPhone,
        supplierEmail: data.supplierEmail,
        supplierAddress: data.supplierAddress,

        // Status
        status: 'CONFIRMED',

        // Notes
        internalNotes: data.internalNotes,
        clientNotes: data.clientNotes,
      },
      include: {
        client: true,
        agent: true,
      },
    });

    // 7. Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'BOOKING_CREATED',
        entityType: 'Booking',
        entityId: booking.id,
        changes: JSON.stringify({ bookingId: booking.id, totalPrice }),
      },
    });

    // 8. Send email notification to client
    try {
      const clientUsers = await prisma.user.findMany({
        where: {
          // Find users associated with this client
          // Note: This assumes User has a clientId field or relation
          // If not, we'll use the client email directly
        },
      });

      // Get client email from booking
      const clientEmail = booking.client?.email;
      if (clientEmail) {
          // Find user associated with client
          const clientUser = await prisma.user.findFirst({
            where: {
              // Try to find user by client email or clientId relation
              email: clientEmail,
            },
          });

          await notificationService.sendNotification({
            userId: clientUser?.id || booking.clientId, // Use user ID if found, otherwise clientId
            bookingId: booking.id,
            type: 'BOOKING_CONFIRMED',
            title: `Rezervare Confirmată: ${booking.id}`,
            message: `Rezervarea dumneavoastră ${booking.id} a fost confirmată.\n\nDetalii:\n- Port origine: ${booking.portOrigin}\n- Port destinație: ${booking.portDestination}\n- Tip container: ${booking.containerType}\n- Preț total: ${booking.totalPrice} ${booking.currency || 'USD'}\n\nVă vom anunța când containerul va fi disponibil pentru tracking.`,
            channels: { email: true, push: false, sms: false, whatsapp: false },
          });
      }
    } catch (error) {
      console.error('[BookingsService] Failed to send booking confirmation email:', error);
      // Don't fail the booking creation if email fails
    }

    return booking;
  }

  /**
   * Find all bookings with filters and pagination
   */
  async findAll(filters: BookingFilters, userId: string, userRole: string) {
    const where: any = {};

    // Authorization: Clients see only their bookings
    if (userRole === 'CLIENT') {
      // Get the Client ID associated with this User
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        const client = await prisma.client.findUnique({ where: { email: user.email } });
        if (client) {
          where.clientId = client.id;
        } else {
          // User has no client record, return empty result
          where.clientId = 'no-client-record';
        }
      }
    } else if (filters.clientId) {
      where.clientId = filters.clientId;
    }

    // Status filter
    if (filters.status) {
      where.status = filters.status;
    }

    // Date range filter
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.createdAt.lte = new Date(filters.dateTo);
      }
    }

    // Search filter (booking ID, container number, client name)
    if (filters.search) {
      where.OR = [
        { id: { contains: filters.search } },
        { client: { companyName: { contains: filters.search } } },
      ];
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
            contactPerson: true,
            email: true,
            phone: true,
          },
        },
        agent: {
          select: {
            id: true,
            company: true,
            contactName: true,
          },
        },
        containers: {
          select: {
            id: true,
            containerNumber: true,
            currentStatus: true,
            currentLocation: true,
            eta: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: filters.limit || 50,
      skip: filters.offset || 0,
    });

    const total = await prisma.booking.count({ where });

    return {
      bookings,
      total,
      limit: filters.limit || 50,
      offset: filters.offset || 0,
    };
  }

  /**
   * Find single booking by ID
   */
  async findOne(id: string, userId: string, userRole: string) {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        client: true,
        agent: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        selectedPrice: true,
        containers: {
          include: {
            trackingEvents: {
              orderBy: { eventDate: 'desc' },
              take: 10,
            },
          },
        },
        documents: true,
        invoices: {
          include: {
            payments: true,
          },
        },
        notifications: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!booking) {
      throw new Error('Booking not found');
    }

    // Authorization check for CLIENT role
    if (userRole === 'CLIENT') {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const client = user ? await prisma.client.findUnique({ where: { email: user.email } }) : null;
      if (!client || booking.clientId !== client.id) {
        throw new Error('Forbidden: You can only view your own bookings');
      }
    }

    return booking;
  }

  /**
   * Update booking
   */
  async update(id: string, data: UpdateBookingDTO, userId: string, userRole: string) {
    // Find existing booking
    const existing = await prisma.booking.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('Booking not found');
    }

    // Authorization check for CLIENT role
    if (userRole === 'CLIENT') {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const client = user ? await prisma.client.findUnique({ where: { email: user.email } }) : null;
      if (!client || existing.clientId !== client.id) {
        throw new Error('Forbidden: You can only update your own bookings');
      }
    }

    // Only admins/managers can update status
    if (data.status && !['ADMIN', 'MANAGER', 'SUPER_ADMIN'].includes(userRole)) {
      throw new Error('Forbidden: Only admins can update booking status');
    }

    // Update booking
    const updated = await prisma.booking.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include: {
        client: true,
        agent: true,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'BOOKING_UPDATED',
        entityType: 'Booking',
        entityId: id,
        changes: JSON.stringify({ before: existing, after: updated }),
      },
    });

    // Send email notification if status changed
    if (data.status && data.status !== existing.status) {
      try {
        const clientEmail = updated.client?.email;
        if (clientEmail) {
          const statusLabels: Record<string, string> = {
            'CONFIRMED': 'Confirmată',
            'IN_TRANSIT': 'În Tranzit',
            'ARRIVED': 'Sosită',
            'DELIVERED': 'Livrată',
            'CANCELLED': 'Anulată',
          };
          
          await notificationService.sendNotification({
            userId: updated.clientId,
            bookingId: updated.id,
            type: 'BOOKING_STATUS_CHANGED',
            title: `Status Rezervare Actualizat: ${booking.id}`,
            message: `Statusul rezervării ${updated.id} a fost actualizat la: ${statusLabels[data.status] || data.status}.\n\nDetalii rezervare:\n- Port origine: ${updated.portOrigin}\n- Port destinație: ${updated.portDestination}\n- Tip container: ${updated.containerType}`,
            channels: { email: true, push: false, sms: false, whatsapp: false },
          });
        }
      } catch (error) {
        console.error('[BookingsService] Failed to send status change email:', error);
        // Don't fail the update if email fails
      }
    }

    return updated;
  }

  /**
   * Soft delete (cancel) booking
   */
  async delete(id: string, userId: string, userRole: string) {
    // Find existing booking
    const existing = await prisma.booking.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('Booking not found');
    }

    // Only admins can delete
    if (!['ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
      throw new Error('Forbidden: Only admins can cancel bookings');
    }

    // Soft delete: Set status to CANCELLED
    const cancelled = await prisma.booking.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        updatedAt: new Date(),
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'BOOKING_CANCELLED',
        entityType: 'Booking',
        entityId: id,
        changes: JSON.stringify({ reason: 'Admin cancelled' }),
      },
    });

    // Send email notification to client
    try {
      const cancelledBooking = await prisma.booking.findUnique({
        where: { id },
        include: { client: true },
      });
      
      if (cancelledBooking?.client?.email) {
        await notificationService.sendNotification({
          userId: cancelledBooking.clientId,
          bookingId: cancelledBooking.id,
          type: 'BOOKING_CANCELLED',
          title: `Rezervare Anulată: ${cancelledBooking.id}`,
          message: `Rezervarea ${cancelledBooking.id} a fost anulată.\n\nDacă aveți întrebări, vă rugăm să ne contactați.\n\nEchipa Promo-Efect`,
          channels: { email: true, push: false, sms: false, whatsapp: false },
        });
      }
    } catch (error) {
      console.error('[BookingsService] Failed to send cancellation email:', error);
      // Don't fail the cancellation if email fails
    }

    return { message: 'Booking cancelled successfully' };
  }

  /**
   * Get booking statistics for dashboard
   */
  async getStats(userId: string, userRole: string) {
    const where: any = {};
    if (userRole === 'CLIENT') {
      // Get the Client ID associated with this User
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        const client = await prisma.client.findUnique({ where: { email: user.email } });
        if (client) {
          where.clientId = client.id;
        } else {
          // No client record, return zeros
          return {
            total: 0,
            byStatus: { CONFIRMED: 0, IN_TRANSIT: 0, DELIVERED: 0, CANCELLED: 0 },
            totalRevenue: 0,
          };
        }
      }
    }

    const [total, confirmed, inTransit, delivered, cancelled] = await Promise.all([
      prisma.booking.count({ where }),
      prisma.booking.count({ where: { ...where, status: 'CONFIRMED' } }),
      prisma.booking.count({ where: { ...where, status: 'IN_TRANSIT' } }),
      prisma.booking.count({ where: { ...where, status: 'DELIVERED' } }),
      prisma.booking.count({ where: { ...where, status: 'CANCELLED' } }),
    ]);

    const totalRevenue = await prisma.booking.aggregate({
      where: { ...where, status: { not: 'CANCELLED' } },
      _sum: { totalPrice: true },
    });

    return {
      total,
      byStatus: {
        confirmed,
        inTransit,
        delivered,
        cancelled,
      },
      totalRevenue: totalRevenue._sum.totalPrice || 0,
    };
  }
}
