import { Fragment } from 'react';
import type { WeddingInvitation } from '@entities/WeddingInvitation/model';
import WeddingCalendar from './WeddingCalendar';
import useInvitationContents from '@entities/WeddingInvitation/hooks/useInvitationContents';

interface Props {
  data: WeddingInvitation;
}
function Home({ data }: Props) {
  const { weddingDate } = useInvitationContents();

  return (
    <>
      <p style={{ textAlign: 'center' }}>모시는 글</p>
      <p style={{ textAlign: 'center' }}>
        {data.invitationInfo.message.split('\n').map((line, i) => (
          <Fragment key={i}>
            {line}
            <br />
          </Fragment>
        ))}
      </p>
      <p>{weddingDate}</p>
      <WeddingCalendar />
    </>
  );
}

export default Home;
