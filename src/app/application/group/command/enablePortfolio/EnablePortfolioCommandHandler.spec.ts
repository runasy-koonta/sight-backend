import { Test } from '@nestjs/testing';
import { advanceTo, clear } from 'jest-date-mock';

import { EnablePortfolioCommand } from '@sight/app/application/group/command/enablePortfolio/EnablePortfolioCommand';
import { EnablePortfolioCommandHandler } from '@sight/app/application/group/command/enablePortfolio/EnablePortfolioCommandHandler';

import {
  GroupRepository,
  IGroupRepository,
} from '@sight/app/domain/group/IGroupRepository';

import { Message } from '@sight/constant/message';
import { GroupFixture } from '@sight/__test__/fixtures/GroupFixture';
import {
  GroupMemberRepository,
  IGroupMemberRepository,
} from '@sight/app/domain/group/IGroupMemberRepository';
import {
  GroupLogger,
  IGroupLogger,
} from '@sight/app/domain/group/IGroupLogger';
import { PointGrantService } from '@sight/app/domain/user/service/PointGrantService';
import {
  ISlackSender,
  SlackSender,
} from '@sight/app/domain/adapter/ISlackSender';
import { DomainFixture } from '@sight/__test__/fixtures';
import { Point } from '@sight/constant/point';

describe('EnablePortfolioCommandHandler', () => {
  let handler: EnablePortfolioCommandHandler;
  let groupRepository: jest.Mocked<IGroupRepository>;
  let groupMemberRepository: jest.Mocked<IGroupMemberRepository>;
  let groupLogger: jest.Mocked<IGroupLogger>;
  let pointGrantService: jest.Mocked<PointGrantService>;
  let slackSender: jest.Mocked<ISlackSender>;

  beforeEach(async () => {
    advanceTo(new Date());

    const testModule = await Test.createTestingModule({
      providers: [
        EnablePortfolioCommandHandler,
        {
          provide: GroupRepository,
          useValue: { findById: jest.fn(), save: jest.fn() },
        },
        {
          provide: GroupMemberRepository,
          useValue: { findByGroupId: jest.fn() },
        },
        {
          provide: GroupLogger,
          useValue: { log: jest.fn() },
        },
        {
          provide: PointGrantService,
          useValue: { grant: jest.fn() },
        },
        {
          provide: SlackSender,
          useValue: { send: jest.fn() },
        },
      ],
    }).compile();

    handler = testModule.get(EnablePortfolioCommandHandler);
    groupRepository = testModule.get(GroupRepository);
    groupMemberRepository = testModule.get(GroupMemberRepository);
    groupLogger = testModule.get(GroupLogger);
    pointGrantService = testModule.get(PointGrantService);
    slackSender = testModule.get(SlackSender);
  });

  afterEach(() => clear());

  describe('execute', () => {
    test('그룹이 존재하지 않으면 예외를 발생시켜야 한다', async () => {
      groupRepository.findById.mockResolvedValue(null);

      const command = new EnablePortfolioCommand('groupId', 'requesterUserId');
      await expect(handler.execute(command)).rejects.toThrow(
        Message.GROUP_NOT_FOUND,
      );
    });

    test('요청자가 그룹장이 아니라면 예외를 발생시켜야 한다', async () => {
      const group = GroupFixture.inProgressJoinable({ hasPortfolio: false });
      const notAdminUserId = 'not-admin-user-id';

      groupRepository.findById.mockResolvedValue(group);

      const command = new EnablePortfolioCommand('groupId', notAdminUserId);
      await expect(handler.execute(command)).rejects.toThrow();
    });

    test('포트폴리오를 발행해야 한다', async () => {
      const group = GroupFixture.inProgressJoinable({ hasPortfolio: false });
      const adminUserId = group.adminUserId;

      groupRepository.findById.mockResolvedValue(group);
      groupMemberRepository.findByGroupId.mockResolvedValue([]);
      jest.spyOn(group, 'enablePortfolio');

      const command = new EnablePortfolioCommand('groupId', adminUserId);
      await handler.execute(command);

      expect(group.enablePortfolio).toBeCalled();
    });

    test('포트폴리오 발행 그룹 로그를 생성해야 한다', async () => {
      const group = GroupFixture.inProgressJoinable({ hasPortfolio: false });
      const adminUserId = group.adminUserId;

      groupRepository.findById.mockResolvedValue(group);
      groupMemberRepository.findByGroupId.mockResolvedValue([]);

      const command = new EnablePortfolioCommand('groupId', adminUserId);
      await handler.execute(command);

      expect(groupLogger.log).toBeCalled();
    });

    test('모든 그룹원에게 포인트를 부여해야 한다', async () => {
      const group = GroupFixture.inProgressJoinable({ hasPortfolio: false });
      const adminUserId = group.adminUserId;
      const groupMemberUserIds = ['user1', 'user2'];

      groupRepository.findById.mockResolvedValue(group);
      groupMemberRepository.findByGroupId.mockResolvedValue([
        DomainFixture.generateGroupMember({ userId: groupMemberUserIds[0] }),
        DomainFixture.generateGroupMember({ userId: groupMemberUserIds[1] }),
      ]);

      const command = new EnablePortfolioCommand('groupId', adminUserId);
      await handler.execute(command);

      expect(pointGrantService.grant).toHaveBeenCalledWith({
        targetUserIds: groupMemberUserIds,
        amount: Point.GROUP_ENABLED_PORTFOLIO,
        reason: expect.any(String),
      });
    });

    test('그룹장에게 메시지를 보내야 한다', async () => {
      const group = GroupFixture.inProgressJoinable({ hasPortfolio: false });
      const adminUserId = group.adminUserId;

      groupRepository.findById.mockResolvedValue(group);
      groupMemberRepository.findByGroupId.mockResolvedValue([]);

      const command = new EnablePortfolioCommand('groupId', adminUserId);
      await handler.execute(command);

      expect(slackSender.send).toHaveBeenCalledWith(
        expect.objectContaining({ targetUserId: adminUserId }),
      );
    });
  });
});
