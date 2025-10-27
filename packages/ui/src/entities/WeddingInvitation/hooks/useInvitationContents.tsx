import { useInvitation } from '../Context';
import dayjs from 'dayjs';

export function useInvitationContents() {
  const metadata = useInvitation();
  const {
    weddingHallInfo: { date, ampm, hour, minute },
  } = metadata;

  const formattedDate = dayjs(date).format('YYYY년 M월 D일');
  const formattedTime = dayjs().hour(hour).minute(minute).format(`A h:mm`);
  const formattedDay = dayjs(date).format('ddd');

  const weddingDate = `${formattedDate} ${formattedDay} ${formattedTime}`;

  return { weddingDate };
}
