-- 1. Insert Initial Data (slug: 'hakjoo-minjeong')
INSERT INTO public.momozzang (slug, data)
VALUES (
  'hakjoo-minjeong',
  '{
  "version": "1.0.0",
  "theme": "CYWORLD",
  "invitationInfo": {
    "order": {
      "name": "이학주",
      "phone": { "number": "01077555457", "isInternational": false, "countryCode": "+82" },
      "email": "hakjoo@example.com"
    },
    "url": "hakjoo-minjeong",
    "title": "학주 & 민정의 모바일 청첩장",
    "message": "소중한 분들을 초대합니다.\\n\\n앞으로 평생 함께하고 싶은 사람을 만나,\\n연인에서 부부로\\n새로운 시작을 하려고 합니다.\\n      ",
    "shareImageUrl": "https://cdn.example.com/invitations/hakjoo-minjeong/share.jpg"
  },
  "couple": {
    "groom": {
      "name": "이학주",
      "phone": { "number": "01077555457", "isInternational": false, "countryCode": "+82" },
      "email": "hakjoo@example.com",
      "accounts": [
        {
          "id": "acct-groom",
          "target": "self",
          "bank": "국민",
          "accountNumber": "94290200403251",
          "accountHolder": "이학주",
          "kakaoPayEnabled": false,
          "kakaoPayCode": "KAKAOPAY-GROOM-20260418"
        }
      ]
    },
    "bride": {
      "name": "강민정",
      "phone": { "number": "01075013884", "isInternational": false, "countryCode": "+82" },
      "email": "minjeong@example.com",
      "accounts": [
        {
          "id": "acct-bride",
          "target": "self",
          "bank": "부산",
          "accountNumber": "218120380398",
          "accountHolder": "강민정",
          "kakaoPayEnabled": false,
          "kakaoPayCode": "KAKAOPAY-BRIDE-20260418"
        }
      ]
    }
  },
  "parents": {
    "enabled": true,
    "groomFather": {
      "name": "이우상",
      "phone": { "number": "01062690482", "isInternational": false, "countryCode": "+82" },
      "accounts": []
    },
    "groomMother": {
      "name": "배용갑",
      "phone": { "number": "01043109932", "isInternational": false, "countryCode": "+82" },
      "accounts": []
    },
    "brideFather": {
      "name": "강상모",
      "phone": { "number": "01087105285", "isInternational": false, "countryCode": "+82" },
      "accounts": []
    },
    "brideMother": {
      "name": "김숙희",
      "phone": { "number": "01057285285", "isInternational": false, "countryCode": "+82" },
      "accounts": []
    }
  },
  "weddingHallInfo": {
    "date": "2026-04-05",
    "ampm": "PM",
    "hour": 12,
    "minute": 30,
    "hallName": "경기교총 웨딩하우스",
    "hallDetail": "베네치아홀",
    "lineBreakBetweenNameAndHall": true,
    "tel": "031-256-0700",
    "address": "경기도 수원시 팔달구 매산로1가 89-13",
    "latitude": 37.2767981,
    "longitude": 127.0075225
  },
  "rsvpRequest": {
    "enabled": true,
    "title": "참석 여부를 알려주세요",
    "content": "원활한 준비를 위해 참석 인원과 식사 여부 등을 입력 부탁드립니다.",
    "include": {
      "attendeeCount": true,
      "mealOption": true,
      "contact": true,
      "companionName": false,
      "charterBus": false
    },
    "separateForBrideGroom": false,
    "popupOnAccess": false
  },
  "etcInfo": {
    "enabled": true,
    "busInfo": {
      "info": ["정류장: 병무청입구(일반), 병무청 사거리(마을)"],
      "subInfo": [
        "일반: 3, 5 , 7-1, 7-1A, 7-2, 60, 66, 66-4, 82-1, 83-1, 301, 310, 400A, 700-2, 777, 900, 1007, 2007, 7770, 8401, 8409",
        "마을: 27-3"
      ]
    },
    "carInfo": {
      "info": ["내비게이션 검색어: 경기교총 웨딩하우스"],
      "subInfo": ["경기교총 웨딩하우스 주차장 또는 구)경기도청 주차장 이용 가능"]
    },
    "metroInfo": {
      "info": ["1호선 / 수인분당선 수원역 지하상가 13번 출구 (셔틀버스 수시 운행)"]
    }
  },
  "congratulatoryMoneyInfo": {
    "enabled": true,
    "cardPayment": true
  },
  "images": [],
  "album": [],
  "bgm": {
    "enabled": true,
    "library": [
      {
        "id": "bgm-1",
        "title": "Spring Light",
        "artist": "Studio Free",
        "previewUrl": "https://cdn.example.com/bgm/spring-light.mp3",
        "license": "free"
      },
      {
        "id": "bgm-2",
        "title": "Promise",
        "artist": "Lumen",
        "previewUrl": "https://cdn.example.com/bgm/promise.mp3",
        "license": "free"
      }
    ],
    "selectedTrackId": "bgm-2"
  },
  "customization": {
    "enabled": true,
    "themeColor": "#F1FDF3",
    "mainImageUrl": "https://cdn.example.com/invitations/hakjoo-minjeong/main.jpg",
    "showDDay": true,
    "mood": "기쁨",
    "miniRoom": {
      "coupleAvatarTemplateId": "mini-couple-01",
      "roomTemplateId": "classic-garden"
    }
  },
  "aboutUs": {
    "title": "같은 여름에 태어난 두사람",
    "brideDesc": "신부 이모짱은 어떤 사람이냐면요",
    "brideImageUrl": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600",
    "groomDesc": "신랑 이모짱은 어떤 사람이냐면요",
    "groomImageUrl": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600"
  }
}'::jsonb
);

-- 2. Update Example: Change the groom's name
UPDATE public.momozzang
SET data = jsonb_set(data, '{couple,groom,name}', '"이학주 (수정됨)"')
WHERE slug = 'hakjoo-minjeong';

-- 3. Update Example: Replace the entire JSON (keeping ID and Slug)
UPDATE public.momozzang
SET data = '{
  "version": "1.0.1",
  ... (전체 JSON 내용) ...
}'::jsonb
WHERE slug = 'hakjoo-minjeong';
