import diamondImg from '@shared/assets/images/diamond.png';
import weddingDayImg from '@shared/assets/images/wedding-day.png';

import styles from './RingPhoto.module.css';
interface PhotoFrameProps {
  src?: string;
  alt?: string;
  maxWidth?: number;
}

export function RingPhoto({ src, alt, maxWidth }: PhotoFrameProps) {
  return (
    <div style={{ maxWidth }} className={styles.container}>
      <img className={styles.diamondImg} src={diamondImg} alt="" aria-hidden="true" />
      <svg
        viewBox="0 0 289 382"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={alt}
        className={styles.svgBox}
      >
        <defs>
          <filter
            id="ring-glow"
            x="96.7988"
            y="0"
            width="90.7539"
            height="82.3741"
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feColorMatrix
              in="SourceAlpha"
              type="matrix"
              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
              result="hardAlpha"
            />
            <feOffset />
            <feGaussianBlur stdDeviation="6.5" />
            <feComposite in2="hardAlpha" operator="out" />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0.702505 0 0 0 0 1 0 0 0 0 0.965292 0 0 0 0.5 0"
            />
            <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow" />
            <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape" />
          </filter>
          <filter id="photo-filter" colorInterpolationFilters="sRGB">
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
            <feColorMatrix
              in="SourceAlpha"
              type="matrix"
              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
              result="hardAlpha"
            />
            <feOffset dy="2" />
            <feGaussianBlur stdDeviation="2" />
            <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0.701 0 0 0 0 0.736 0 0 0 0 1 0 0 0 0.25 0"
            />
            <feBlend mode="normal" in2="shape" result="effect1" />
            <feColorMatrix
              in="SourceAlpha"
              type="matrix"
              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
              result="hardAlpha"
            />
            <feOffset dy="-2" />
            <feGaussianBlur stdDeviation="1.5" />
            <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0.461 0 0 0 0 0.592 0 0 0 0 0.898 0 0 0 0.5 0"
            />
            <feBlend mode="normal" in2="effect1" result="effect2" />
          </filter>

          {/* 프레임 내부 영역을 위한 클립패스 - 프레임의 안쪽 경계 */}
          <clipPath id="frame-inner-clip" clipPathUnits="userSpaceOnUse">
            <path
              d="
              M 89.792 60.9694
              L 195.447 60.9694
              L 195.447 69.2555
              L 211.312 69.2555
              L 211.312 75.7906
              L 223.742 75.7906
              L 223.742 81.2369
              L 235.137 81.2369
              L 235.137 88.8619
              L 246.53 88.8619
              L 246.53 100.843
              L 258.961 100.843
              L 258.961 104.111
              L 259.086 104.111
              L 259.086 113.915
              L 268.283 113.915
              L 268.283 128.075
              L 276.57 128.075
              L 276.57 144.413
              L 284.856 144.413
              L 284.856 168.377
              L 289 168.377
              L 289 274.032
              L 284.856 274.032
              L 284.856 297.996
              L 276.57 297.996
              L 276.57 314.335
              L 268.283 314.335
              L 268.283 328.494
              L 259.086 328.494
              L 259.086 338.297
              L 258.961 338.297
              L 258.961 341.565
              L 246.531 341.565
              L 246.531 353.547
              L 235.137 353.547
              L 235.137 361.172
              L 223.742 361.172
              L 223.742 366.618
              L 211.312 366.618
              L 211.312 373.153
              L 199.208 373.153
              L 199.208 381.439
              L 93.5527 381.439
              L 93.5527 373.153
              L 77.6875 373.153
              L 77.6875 366.618
              L 65.2578 366.618
              L 65.2578 361.172
              L 53.8633 361.172
              L 53.8633 353.547
              L 42.4688 353.547
              L 42.4688 341.565
              L 30.0391 341.565
              L 30.0391 338.297
              L 29.9141 338.297
              L 29.9141 328.494
              L 20.7168 328.494
              L 20.7168 314.335
              L 12.4297 314.335
              L 12.4297 297.996
              L 4.14355 297.996
              L 4.14355 274.032
              L 0 274.032
              L 0 168.377
              L 4.14355 168.377
              L 4.14355 144.413
              L 12.4297 144.413
              L 12.4297 128.075
              L 20.7168 128.075
              L 20.7168 113.915
              L 29.9141 113.915
              L 29.9141 104.111
              L 30.0391 104.111
              L 30.0391 100.843
              L 42.4697 100.843
              L 42.4697 88.8619
              L 53.8643 88.8619
              L 53.8643 81.2369
              L 65.2578 81.2369
              L 65.2578 75.7916
              L 83.9033 75.7916
              L 83.9033 81.2379
              L 77.6865 81.2379
              L 77.6865 69.2555
              L 89.792 69.2555
              Z
            "
            />
          </clipPath>
        </defs>

        {/* 배경 이미지 - 클립패스 적용 */}
        <image
          href={src}
          x="-20"
          y="50"
          width="330"
          height="340"
          preserveAspectRatio="xMidYMid slice"
          clipPath="url(#frame-inner-clip)"
        />

        {/* 프레임 오버레이 */}
        <g filter="url(#photo-filter)">
          <path
            d="M199.208 381.439H93.5527V373.153H77.6875V366.618H65.2578V361.172H53.8633V353.547H42.4688V341.565H30.0391V338.297H29.9141V328.494H20.7168V314.335H12.4297V297.996H4.14355V274.032H0V168.377H4.14355V144.413H12.4297V128.075H20.7168V113.915H29.9141V104.111H30.0391V100.843H42.4697V88.8619H53.8643V81.2369H65.2578V75.7916H83.9033V81.2379H71.4736V88.8619H61.1133V96.486H49.7207V108.468H38.2012V113.915H38.3262V120.45H26.9316V134.61H18.6445V144.413H18.6455V150.949H12.4307V171.484H8.28711V270.925H11.3945V291.461H18.6455V307.798H26.9316V321.959H38.3262V328.494H38.2012V333.94H49.7207V341.565H49.7197V345.922H61.1143V353.547H71.4727V361.172H83.9033V366.617H99.4404V373.153H189.561V366.617H205.097V361.172H217.527V353.547H227.886V345.922H239.28V341.565H239.279V333.94H250.799V328.494H250.674V321.959H262.068V307.798H270.354V291.461H276.57V270.925H280.713V171.484H276.57V150.949H270.354V134.61H262.068V120.45H250.674V113.915H250.799V108.468H239.279V96.486H227.887V88.8619H217.527V81.2379H205.097V75.7916H223.742V81.2369H235.137V88.8619H246.53V100.843H258.961V104.111H259.086V113.915H268.283V128.075H276.57V144.413H284.856V168.377H289V274.032H284.856V297.996H276.57V314.335H268.283V328.494H259.086V338.297H258.961V341.565H246.531V353.547H235.137V361.172H223.742V366.618H211.312V373.153H199.208V381.439ZM195.447 69.2555H211.312V75.7906H189.561V69.2555H99.4395V75.7906H77.6865V69.2555H89.792V60.9694H195.447V69.2555Z"
            fill="white"
          />
        </g>
      </svg>

      <img className={styles.weddingDayImg} src={weddingDayImg} alt="웨딩데이" />
    </div>
  );
}
