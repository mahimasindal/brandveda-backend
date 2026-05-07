import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Prompt, PromptDocument } from './schemas/prompt.schema';
import { UpdatePromptDto } from './dto/update-prompt.dto';
import { generatePrompts } from './prompt-templates';

@Injectable()
export class PromptsService {
  constructor(
    @InjectModel(Prompt.name) private promptModel: Model<PromptDocument>,
  ) {}

  async generateForBrand(
    brandId: string,
    userId: string,
    brandName: string,
    category: string,
    competitors: string[],
    targetAudience: string,
  ): Promise<PromptDocument[]> {
    const templates = generatePrompts(
      brandName,
      category,
      competitors,
      targetAudience,
    );
    const docs = templates.map((t) => ({
      brandId: new Types.ObjectId(brandId),
      userId: new Types.ObjectId(userId),
      ...t,
    }));
    return this.promptModel.insertMany(docs) as unknown as PromptDocument[];
  }

  async findByBrand(
    brandId: string,
    userId: string,
  ): Promise<PromptDocument[]> {
    return this.promptModel
      .find({
        brandId: new Types.ObjectId(brandId),
        userId: new Types.ObjectId(userId),
      })
      .sort({ stage: 1, index: 1 });
  }

  async updateOne(
    promptId: string,
    brandId: string,
    userId: string,
    dto: UpdatePromptDto,
  ): Promise<PromptDocument> {
    const prompt = await this.promptModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(promptId),
        brandId: new Types.ObjectId(brandId),
        userId: new Types.ObjectId(userId),
      },
      { $set: { text: dto.text, isCustomized: true } },
      { new: true },
    );
    if (!prompt) throw new NotFoundException('Prompt not found');
    return prompt;
  }
}
