export const CONFIRMATION = (name: string, partySize: number, date: string, time: string, code: string) => `رزرو شما تأیید شد.\n\nنام: ${name}\nتعداد مهمانان: ${partySize} نفر\nتاریخ: ${date}\nساعت: ${time}\nکد رزرو: ${code}`;

export const CANCELLED = (code: string) => `رزرو شما لغو شد.\n\nکد رزرو: ${code}`;

export const TABLE_CHANGED = (tableName: string, time: string) => `اطلاع‌رسانی رزرو\n\nمیز شما تغییر کرد.\nمیز جدید: ${tableName}\nساعت: ${time}`;

export const REMINDER = (partySize: number, time: string, code: string) => `یادآوری رزرو\n\nامروز ساعت ${time} منتظر شما هستیم.\n${partySize} مهمان\nکد رزرو: ${code}`;
