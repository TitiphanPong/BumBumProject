import { describe, expect, it } from 'vitest';
import { getClaimUpdateNotificationType } from './claim-notification-transition';

describe('getClaimUpdateNotificationType', () => {
  it('sends final-claim notification only when entering the final claim status', () => {
    expect(
      getClaimUpdateNotificationType(
        { status: 'รอเคลม', inspectstatus: 'รอตรวจสอบ' },
        { status: 'จบเคลม', inspectstatus: 'รอตรวจสอบ' }
      )
    ).toBe('จบเคลม');
  });

  it('does not resend final-claim notification when editing an already completed claim', () => {
    expect(
      getClaimUpdateNotificationType(
        { status: 'จบเคลม', inspectstatus: 'จบการตรวจสอบ' },
        { status: 'จบเคลม', inspectstatus: 'จบการตรวจสอบ' }
      )
    ).toBe('อัปเดตรายการเคลม');
  });

  it('sends inspection-completed notification only when entering that inspection status', () => {
    expect(
      getClaimUpdateNotificationType(
        { status: 'รอเคลม', inspectstatus: 'รอตรวจสอบ' },
        { status: 'รอเคลม', inspectstatus: 'จบการตรวจสอบ' }
      )
    ).toBe('จบการตรวจสอบ');
  });

  it('does not resend inspection-completed notification when only other fields are edited', () => {
    expect(
      getClaimUpdateNotificationType(
        { status: 'รอเคลม', inspectstatus: 'จบการตรวจสอบ' },
        { status: 'รอเคลม', inspectstatus: 'จบการตรวจสอบ' }
      )
    ).toBe('อัปเดตรายการเคลม');
  });

  it('prioritizes a new final-claim transition over inspection status', () => {
    expect(
      getClaimUpdateNotificationType(
        { status: 'รอเคลม', inspectstatus: 'รอตรวจสอบ' },
        { status: 'จบเคลม', inspectstatus: 'จบการตรวจสอบ' }
      )
    ).toBe('จบเคลม');
  });
});
