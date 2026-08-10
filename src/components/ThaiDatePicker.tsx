'use client';

import generatePicker from 'antd/es/date-picker/generatePicker';
import type { Dayjs } from 'dayjs';
import dayjsGenerateConfig from 'rc-picker/lib/generate/dayjs';
import { normalizeBuddhistDateFormats, normalizeBuddhistDateInput } from '@/lib/buddhist-date';

const defaultLocale = dayjsGenerateConfig.locale;

const buddhistGenerateConfig = {
  ...dayjsGenerateConfig,
  locale: {
    ...defaultLocale,
    parse(locale: string, text: string, formats: string[]) {
      return defaultLocale.parse(
        locale,
        normalizeBuddhistDateInput(text),
        normalizeBuddhistDateFormats(formats)
      );
    },
  },
};

const ThaiDatePicker = generatePicker<Dayjs>(buddhistGenerateConfig);

export default ThaiDatePicker;
