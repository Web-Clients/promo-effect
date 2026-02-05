/**
 * Ports Service
 * CRUD operations for managing shipping ports
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type PortType = 'ORIGIN' | 'DESTINATION';

export interface CreatePortDto {
  name: string;
  code?: string;
  country: string;
  type: PortType;
}

export interface UpdatePortDto {
  name?: string;
  code?: string;
  country?: string;
  isActive?: boolean;
}

class PortsService {
  /**
   * Get all ports, optionally filtered by type
   */
  async getAll(type?: PortType, includeInactive = false) {
    const where: any = {};

    if (type) {
      where.type = type;
    }

    if (!includeInactive) {
      where.isActive = true;
    }

    return prisma.port.findMany({
      where,
      orderBy: [
        { type: 'asc' },
        { country: 'asc' },
        { name: 'asc' }
      ]
    });
  }

  /**
   * Get origin ports only
   */
  async getOriginPorts(includeInactive = false) {
    return this.getAll('ORIGIN', includeInactive);
  }

  /**
   * Get destination ports only
   */
  async getDestinationPorts(includeInactive = false) {
    return this.getAll('DESTINATION', includeInactive);
  }

  /**
   * Get a single port by ID
   */
  async getById(id: string) {
    return prisma.port.findUnique({
      where: { id }
    });
  }

  /**
   * Create a new port
   */
  async create(data: CreatePortDto) {
    // Check if port with same name and type already exists
    const existing = await prisma.port.findFirst({
      where: {
        name: data.name,
        type: data.type
      }
    });

    if (existing) {
      throw new Error(`Port "${data.name}" of type ${data.type} already exists`);
    }

    return prisma.port.create({
      data: {
        name: data.name,
        code: data.code,
        country: data.country,
        type: data.type
      }
    });
  }

  /**
   * Update a port
   */
  async update(id: string, data: UpdatePortDto) {
    const port = await prisma.port.findUnique({ where: { id } });

    if (!port) {
      throw new Error('Port not found');
    }

    // If changing name, check for duplicates
    if (data.name && data.name !== port.name) {
      const existing = await prisma.port.findFirst({
        where: {
          name: data.name,
          type: port.type,
          id: { not: id }
        }
      });

      if (existing) {
        throw new Error(`Port "${data.name}" of type ${port.type} already exists`);
      }
    }

    return prisma.port.update({
      where: { id },
      data
    });
  }

  /**
   * Delete a port (soft delete by setting isActive to false)
   */
  async delete(id: string) {
    const port = await prisma.port.findUnique({ where: { id } });

    if (!port) {
      throw new Error('Port not found');
    }

    // Soft delete
    return prisma.port.update({
      where: { id },
      data: { isActive: false }
    });
  }

  /**
   * Hard delete a port (use with caution)
   */
  async hardDelete(id: string) {
    return prisma.port.delete({
      where: { id }
    });
  }

  /**
   * Seed initial ports data
   */
  async seedPorts() {
    const originPorts = [
      { name: 'Shanghai', code: 'CNSHA', country: 'China' },
      { name: 'Ningbo', code: 'CNNGB', country: 'China' },
      { name: 'Qingdao', code: 'CNTAO', country: 'China' },
      { name: 'Tianjin', code: 'CNTSN', country: 'China' },
      { name: 'Xiamen', code: 'CNXMN', country: 'China' },
      { name: 'Shenzhen', code: 'CNSZX', country: 'China' },
      { name: 'Guangzhou', code: 'CNGZH', country: 'China' },
      { name: 'Dalian', code: 'CNDAL', country: 'China' },
      { name: 'Foshan', code: 'CNFOS', country: 'China' },
    ];

    const destinationPorts = [
      { name: 'Constanta', code: 'ROCON', country: 'Romania' },
      { name: 'Odessa', code: 'UAODS', country: 'Ukraine' },
    ];

    let created = 0;

    for (const port of originPorts) {
      const existing = await prisma.port.findFirst({
        where: { name: port.name, type: 'ORIGIN' }
      });

      if (!existing) {
        await prisma.port.create({
          data: { ...port, type: 'ORIGIN' }
        });
        created++;
      }
    }

    for (const port of destinationPorts) {
      const existing = await prisma.port.findFirst({
        where: { name: port.name, type: 'DESTINATION' }
      });

      if (!existing) {
        await prisma.port.create({
          data: { ...port, type: 'DESTINATION' }
        });
        created++;
      }
    }

    return { created };
  }
}

export default new PortsService();
