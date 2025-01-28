import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';

import { InfraBlueManageController } from '@khlug/app/interface/infraBlue/manager/InfraBlueManageController';
import { UserManageController } from '@khlug/app/interface/user/manager/UserManageController';

import { UpdateDoorLockPasswordCommandHandler } from '@khlug/app/application/infraBlue/command/updateDoorLockPassword/UpdateDoorLockPasswordCommandHandler';
import { GetDoorLockPasswordQueryHandler } from '@khlug/app/application/infraBlue/query/getDoorLockPassword/GetDoorLockPasswordQueryHandler';
import { ListUserQueryHandler } from '@khlug/app/application/user/query/listUser/ListUserQueryHandler';

import { Cache } from '@khlug/app/domain/cache/model/Cache';
import { User } from '@khlug/app/domain/user/model/User';

const controllers = [];
const manageControllers = [InfraBlueManageController, UserManageController];

const commandHandlers = [UpdateDoorLockPasswordCommandHandler];
const queryHandlers = [GetDoorLockPasswordQueryHandler, ListUserQueryHandler];

@Module({
  imports: [MikroOrmModule.forFeature([Cache, User])],
  controllers: [...controllers, ...manageControllers],
  providers: [...commandHandlers, ...queryHandlers],
})
export class AppModule {}
