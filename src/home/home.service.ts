/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PropertyType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { HomeResponseDto } from './dtos/home.dto';
import { UserInfo } from '../user/decorators/user.decoratos';

interface GetHomeQueryData {
  city?: string;
  price?: {
    gte?: number;
    lte?: number;
  };
  propertyType?: PropertyType;
}

export const HomeSelect = {
  id: true,
  address: true,
  city: true,
  property_type: true,
  listed_date: true,
  number_of_bedrooms: true,
  number_of_bathrooms: true,
  price: true,
};

interface CreateHomeData {
  address: string;
  city: string;
  price: number;
  numberOfBathrooms: number;
  numberOfBedrooms: number;
  landSize: number;
  propertyType: PropertyType;
  images: { url: string }[];
}
interface UpdateHomeData {
  address?: string;
  city?: string;
  price?: number;
  numberOfBathrooms?: number;
  numberOfBedrooms?: number;
  landSize?: number;
  propertyType?: PropertyType;
}

@Injectable()
export class HomeService {
  constructor(private readonly prismaService: PrismaService) {}

  async getHomes(filter: GetHomeQueryData): Promise<HomeResponseDto[]> {
    const homes = await this.prismaService.home.findMany({
      select: {
        ...HomeSelect,
        images: {
          select: {
            url: true,
          },
          take: 1,
        },
      },
      where: filter,
    });

    if (!homes.length) {
      throw new NotFoundException();
    }

    return homes.map((home) => {
      const fetchHomes = { ...home, image: home.images[0].url };
      delete fetchHomes.images;
      return new HomeResponseDto(fetchHomes);
    });
  }

  async getHomeById(id: number): Promise<HomeResponseDto> {
    const home = await this.prismaService.home.findUnique({
      where: { id },
      select: {
        ...HomeSelect,
        realtor: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
        images: {
          select: {
            url: true,
          },
          take: 1,
        },
      },
    });
    if (!home) {
      throw new NotFoundException();
    }
    const foundHome = { ...home, image: home.images[0].url };

    delete foundHome.images;

    return new HomeResponseDto(foundHome);
  }

  async createHome(
    {
      address,
      city,
      images,
      landSize,
      numberOfBathrooms,
      numberOfBedrooms,
      price,
      propertyType,
    }: CreateHomeData,
    userId: number,
  ): Promise<HomeResponseDto> {
    const home = await this.prismaService.home.create({
      data: {
        address,
        land_size: landSize,
        number_of_bathrooms: numberOfBathrooms,
        number_of_bedrooms: numberOfBedrooms,
        property_type: propertyType,
        price,
        city,
        realtor_id: userId,
      },
    });

    const homeImages = images.map((image) => {
      return { ...image, home_id: home.id };
    });

    await this.prismaService.image.createMany({
      data: homeImages,
    });

    return new HomeResponseDto(home);
  }

  async updateHomeById(
    id: number,
    data: UpdateHomeData,
  ): Promise<HomeResponseDto> {
    const home = await this.prismaService.home.findUnique({
      where: { id },
    });

    if (!home) {
      throw new NotFoundException();
    }

    const updatedHome = await this.prismaService.home.update({
      where: { id },
      data,
    });

    return new HomeResponseDto(updatedHome);
  }

  async deleteHomeById(id: number) {
    await this.prismaService.image.deleteMany({
      where: { home_id: id },
    });

    await this.prismaService.home.delete({
      where: { id },
    });
  }

  async getRealtorByHomeId(id: number) {
    const home = await this.prismaService.home.findUnique({
      where: { id },
      select: {
        realtor: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });
    if (!home) {
      throw new NotFoundException();
    }

    return home.realtor;
  }

  async inquire(buyer: UserInfo, homeId: number, message: string) {
    const realtor = await this.getRealtorByHomeId(homeId);
    return this.prismaService.message.create({
      data: {
        buyer_id: buyer.id,
        realtor_id: realtor.id,
        message,
        home_id: homeId,
      },
    });
  }

  getHomeMessages(homeId: number) {
    return this.prismaService.message.findMany({
      where: {
        home_id: homeId,
      },
      select: {
        message: true,
        buyer: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });
  }
}
