import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Brand, BrandDocument } from './schemas/brand.schema';
import { UpdateBrandDto } from './dto/update-brand.dto';

@Injectable()
export class BrandsService {
  constructor(
    @InjectModel(Brand.name) private brandModel: Model<BrandDocument>,
  ) {}

  async create(
    userId: string,
    data: { name: string; website?: string; description?: string },
  ): Promise<BrandDocument> {
    return this.brandModel.create({
      userId: new Types.ObjectId(userId),
      ...data,
    });
  }

  async findAllByUser(userId: string): Promise<BrandDocument[]> {
    return this.brandModel.find({ userId: new Types.ObjectId(userId) });
  }

  async findOneByUser(id: string, userId: string): Promise<BrandDocument> {
    const brand = await this.brandModel.findOne({
      _id: new Types.ObjectId(id),
      userId: new Types.ObjectId(userId),
    });
    if (!brand) throw new NotFoundException('Brand not found');
    return brand;
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateBrandDto,
  ): Promise<BrandDocument> {
    const updateData = Object.fromEntries(
      Object.entries(dto).filter(([, v]) => v !== undefined),
    );
    const brand = await this.brandModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) },
      { $set: updateData },
      { new: true },
    );
    if (!brand) throw new NotFoundException('Brand not found');
    return brand;
  }

  async remove(id: string, userId: string): Promise<void> {
    const result = await this.brandModel.deleteOne({
      _id: new Types.ObjectId(id),
      userId: new Types.ObjectId(userId),
    });
    if (result.deletedCount === 0) throw new NotFoundException('Brand not found');
  }
}
