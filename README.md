# 오렌지 라이브커머스 (Orange Live On)

HMK 홀딩스그룹 라이브커머스 **고객용 홈페이지**입니다.
빌드 도구 없이 그대로 동작하는 정적 사이트라, GitHub에 올리고 Cloudflare Pages에 연결하면 바로 배포됩니다.

> HMK 통합 제작기획서 **08. HMK라이브커머스 고객용 홈페이지** 기준으로 제작했습니다.
> Cloudflare 프로젝트 매핑상 `hmk-hmk-live` / `apps/live-web` 에 해당합니다.

---

## 1. 이 사이트의 성격

기획서에 적힌 포지셔닝을 화면 설계의 축으로 삼았습니다.

> 자체 송출 플랫폼이 아니라, 외부 채널로 송출되는 방송의 통합 안내·콘텐츠 허브

그래서 아래 세 가지를 **절대 하지 않습니다.**

| 하지 않는 것 | 이유 |
|---|---|
| 영상 재생 | 시청은 네이버·유튜브·카카오·틱톡에서 이뤄집니다. 자체 플레이어를 두면 오인됩니다. |
| 결제·주문 | 판매 계약은 각 채널과 판매자 사이에서 성립합니다. |
| 확정 전 가격·재고 표시 | 승인된 PIM/OMS 데이터가 없는 상태에서 가격을 띄우지 않습니다. (수용기준 AC-02) |

정식 오픈 전이므로 **"실제 방송이 진행 중인 것처럼 꾸미지 않는다"** 는 제작지시도 그대로 지켰습니다.
편성은 `계획` 배지를 달고, 외부 채널 링크는 계정 확정 전까지 비활성 상태로 표시합니다.

---

## 2. 파일 구조

```
.
├── index.html            홈
├── schedule.html         LIVE 편성표      (날짜·카테고리·채널 필터)
├── broadcast.html        방송 상세        (?id=B2610011 형태로 진입)
├── products.html         상품·기획전
├── replay.html           다시보기         (오픈 후 공개 · 현재 빈 화면)
├── seller.html           셀러 신청 / 브랜드·상품 제안
├── studio.html           스튜디오 소개·요금·대관 문의
├── fulfillment.html      물류·보관 연계
├── support.html          알림 신청 · FAQ · 문의
├── policy.html           이용약관 · 개인정보처리방침
├── 404.html              오류 화면
├── sitemap.xml / robots.txt
├── _headers              보안 헤더 · 캐시 정책
├── schema.sql            D1 스키마 (선택 · 백엔드 붙일 때)
├── functions/            Cloudflare Pages Functions (선택)
│   └── api/
│       ├── broadcasts.js   GET  편성 조회
│       ├── leads.js        POST 신청·문의 접수
│       └── sync/youtube.js POST 유튜브 방송 자동 연결
└── assets/
    ├── css/style.css     디자인 시스템
    ├── js/data.js        ★ 콘텐츠 데이터 — 운영자가 고칠 파일
    ├── js/app.js         렌더링·필터·폼 검증·캘린더·공유
    ├── js/sim.js         셀러 매출 시뮬레이터
    └── img/              WebP 24종 (총 1.6MB)
```

**운영 중 손댈 파일은 사실상 `assets/js/data.js` 하나입니다.** 나머지는 건드리지 않아도 됩니다.

---

## 3. GitHub 올리기

```bash
cd orangeliveon

git init
git branch -M main
git add .
git commit -m "오렌지 라이브커머스 고객용 홈페이지 초기 구축"

git remote add origin https://github.com/<계정>/orangeliveon.git
git push -u origin main
```

Monorepo(`hmk-platform`)에 넣는다면 `apps/live-web/` 아래에 그대로 두고,
Cloudflare 프로젝트 설정에서 **Root directory**를 `apps/live-web` 으로 지정하면 됩니다.

---

## 4. Cloudflare Pages 배포

1. Cloudflare 대시보드 → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. 방금 올린 저장소를 선택
3. 빌드 설정은 아래처럼 **비워둡니다.**

| 항목 | 값 |
|---|---|
| Framework preset | `None` |
| Build command | *(비움)* |
| Build output directory | `/` (Monorepo면 `apps/live-web`) |
| Root directory | *(비움 또는 `apps/live-web`)* |

4. **Save and Deploy** → 1분 내로 `orangeliveon.com` 가 열립니다.

이후 `main` 브랜치에 push할 때마다 자동 재배포되고, Pull Request에는 미리보기 URL이 붙습니다.

### 도메인 연결

**Custom domains** 탭에서 `live.hmk-holdings.co.kr` 같은 주소를 추가하면 됩니다.
연결 후 `build/shell.py` 와 각 HTML의 `BASE`(`https://orangeliveon.com`)를 실제 도메인으로 바꿔야
`canonical`, `og:url`, `sitemap.xml` 이 맞습니다. 전체 치환 한 번이면 됩니다.

```bash
grep -rl "orangeliveon.com" . | xargs sed -i 's#https://orangeliveon.com#https://live.hmk-holdings.co.kr#g'
```

---

## 5. 콘텐츠 수정 방법 — `assets/js/data.js`

### 5-1. 오픈 상태 바꾸기

```js
config: {
  phase: 'preopen',             // 오픈하면 'open'
  openDate: '2026-10-01',       // 정식 오픈 예정일 — 상단 D-day가 자동 계산됨
  asOf: '2026-08-21',           // 데이터 기준일 (푸터·배지에 표시)
  channelLinksReady: false,     // ★ 채널 계정 확정되면 true
}
```

`channelLinksReady: false` 인 동안에는

- 모든 채널 칩이 비활성(취소선) 상태로 표시되고
- 홈과 편성표 상단에 "외부 채널 링크가 아직 열려 있지 않습니다" 안내가 자동으로 뜹니다

`true` 로 바꾸고 아래처럼 각 채널의 `url` 을 채우면 그 순간부터 링크가 열립니다.

```js
channels: {
  naver: { name: '네이버 쇼핑라이브', short: 'N', color: '#03C75A',
           url: 'https://shoppinglive.naver.com/lives/000000' },
}
```

### 5-2. 방송 추가

`broadcasts` 배열에 객체를 하나 넣으면 홈 레일·편성표·방송상세가 동시에 갱신됩니다.

```js
{
  id: 'B2610080',                       // 방송 번호 (URL에 사용)
  date: '2026-10-08', dow: '목',
  start: '20:00', end: '21:00',
  title: '방송 제목',
  cat: '뷰티',                          // categories 배열 안의 값
  host: '이하린', hostRole: '뷰티 전문 호스트',
  seller: '입점 브랜드 2사',
  thumb: 'live-beauty.webp',            // assets/img/ 안의 파일명
  status: 'scheduled',
  channels: ['naver', 'youtube'],
  studio: 'STUDIO A',
  lineup: ['상품 A', '상품 B'],
  note: ''                              // 비우면 안내 박스가 표시되지 않음
}
```

방송 상태(`LIVE 진행 중` / `방송 예정` / `방송 종료`)는 `date` + `start` + `end` 를 현재 시각과 비교해
**자동으로 계산**됩니다. 따로 손대지 않아도 됩니다.

### 5-3. 다시보기 열기

`replays: []` 가 비어 있는 동안에는 다시보기 페이지가 빈 화면으로 표시됩니다.
항목을 넣으면 목록이 뜨도록 `app.js`의 `initReplay()` 에 렌더 분기를 추가하면 됩니다.

### 5-4. 그 밖에

| 키 | 반영되는 곳 |
|---|---|
| `collections` | 상품·기획전 카드 |
| `studio.rooms / fees / options` | 스튜디오 3실·요금표·제작 옵션 |
| `fulfillment` | 홈과 물류 페이지의 5단계 |
| `roadmap` | 홈 오픈 로드맵 |
| `sellerBenefits` | 홈·셀러 페이지 혜택 카드 |
| `faqs` | 홈 FAQ 발췌 + 고객지원 FAQ (카테고리 탭은 `cat` 값으로 자동 생성) |

---

## 6. 폼 연동하기

지금은 폼이 화면 안에서만 동작합니다. 제출하면 접수번호를 만들어 완료 화면을 보여줄 뿐,
서버로 보내지는 않습니다. 실제 접수로 바꾸려면 `assets/js/app.js` 의 `initForms()` 안,
아래 주석이 달린 자리에 요청을 넣으면 됩니다.

```js
// 실제 연동 시: fetch(CFG.apiBase + '/v1/public/leads', {method:'POST', body: new FormData(f)})
```

연동 대상은 기획서 기준으로 다음과 같습니다.

| 폼 | 접수 경로 | 기획서 Feature ID |
|---|---|---|
| 셀러 신청 | Live Hub Seller CRM | LVC-008 |
| 브랜드·상품 제안 | ERP Product Proposal | LVC-009 |
| 스튜디오 대관 문의 | Live Hub Resource Calendar | LVC-011 |
| 방송 알림 신청 | Notification (마케팅 동의 확인) | LVC-005 |
| 고객 문의 | 유형별 담당 팀 라우팅 | LVC-014 |

Cloudflare Pages Functions를 쓴다면 `functions/api/leads.js` 를 만들어 같은 저장소에서 처리할 수 있습니다.
이 경우 리드 데이터에 개인정보가 포함되므로, 저장 위치와 보유 기간을 `policy.html` 의 표와 반드시 맞춰주세요.

---

## 7. 화면 상태 정의

기획서 08-3의 "필수 상태 화면"을 실제 동작으로 구현했습니다.

| 상태 | 확인 방법 |
|---|---|
| 정상 | `schedule.html` |
| 빈 데이터 | `replay.html`, 또는 편성표에서 `신선식품 + 틱톡` 조합 필터 |
| 로딩 | 편성표 진입 직후 스켈레톤 |
| 입력 오류 | 셀러 신청 폼을 비운 채 제출 |
| 외부연동 지연 | `channelLinksReady: false` 일 때 자동 노출되는 상단 안내 |
| 만료/종료 | 방송 종료 시각이 지나면 `방송 종료` 배지로 자동 전환 |
| 없는 리소스 | `broadcast.html?id=없는값`, `404.html` |
| 모바일 | 920px 이하에서 햄버거 메뉴, 860px 이하에서 편성 행 세로 전환 |

상태는 **색상만으로 구분하지 않습니다.** 모든 배지에 아이콘과 텍스트를 함께 붙였습니다. (WCAG AA)

---

## 8. 디자인 토큰

`assets/css/style.css` 상단 `:root` 에 모여 있습니다.

| 토큰 | 값 | 쓰임 |
|---|---|---|
| `--o-500` | `#FF6A00` | 브랜드 오렌지 · CTA · 강조 |
| `--o-100` | `#FFE6D6` | 연한 배경 블록 |
| `--navy-900` | `#0D1B2A` | 제목 · 다크 섹션 · 푸터 |
| `--bg-3` | `#F2F4F7` | 회색 배경 |
| `--live` | `#FF2D46` | **LIVE 상태 전용** |

`--live` 를 브랜드 오렌지와 분리한 것은 의도적입니다.
오렌지가 CTA와 브랜드 전반에 쓰이기 때문에, LIVE 배지까지 오렌지로 두면 "지금 방송 중"이라는 신호가 묻힙니다.

- 서체: Pretendard(본문·제목) + JetBrains Mono(시간·번호·수치)
- 그리드: 12칼럼 / 최대 1240px / 8pt 간격
- 모션: 160~240ms, `prefers-reduced-motion` 존중

---

## 9. 배포 전 확인 목록

- [ ] `data.js` 의 `openDate`, `asOf` 를 실제 일정으로 수정
- [ ] 푸터의 사업자등록번호·통신판매업신고번호·주소·대표자명 실제 값으로 교체
- [ ] 고객센터 번호(`1668-0000`)와 이메일 주소 확정값으로 교체
- [ ] `policy.html` 을 법무 검토 마친 확정본으로 교체 (현재는 오픈 전 안내본)
- [ ] `BASE` URL을 실제 도메인으로 치환
- [ ] 폼 제출 엔드포인트 연결
- [ ] 이미지 사용 권리 확인 — 현재 이미지는 브랜드 컨셉 이미지이며, 실제 방송·상품 사진으로 교체 권장
- [ ] 채널 계정 확정 후 `channelLinksReady: true` 전환

---

## 10. 자주 겪는 배포 문제

### 메뉴를 누르면 `ERR_TOO_MANY_REDIRECTS`

**원인은 `_redirects` 파일입니다. 이 저장소에는 그 파일이 없어야 합니다.**

Cloudflare Pages는 확장자 없는 주소를 이미 알아서 처리합니다.
`schedule.html` 을 올려두면 `/schedule` 로 접속해도 그대로 열리고,
`/schedule.html` 로 들어오면 `/schedule` 로 한 번 정리해 줍니다.

여기에 아래 같은 규칙을 직접 넣으면 서로를 무한히 되돌리게 됩니다.

```
/schedule   /schedule.html   200      ← 넣으면 안 되는 규칙
```

1. 브라우저가 `/schedule.html` 요청
2. Cloudflare가 `/schedule` 로 정리
3. 위 규칙이 다시 `/schedule.html` 로 되돌림
4. 2번으로 돌아가 무한 반복

해결은 파일을 지우는 것입니다.

```bash
git rm _redirects
git commit -m "무한 리다이렉트를 만드는 _redirects 제거"
git push
```

배포가 끝난 뒤 확인:

```bash
curl -I https://orangeliveon.com/schedule       # 200 이면 정상
curl -I https://orangeliveon.com/schedule.html  # 308 → /schedule (정상)
```

브라우저에 리다이렉트가 캐시되어 있을 수 있으니, 시크릿 창이나 강력 새로고침(Ctrl+Shift+R)으로 확인해 주세요.

### 그 밖에

| 증상 | 확인할 것 |
|---|---|
| 홈은 나오는데 나머지가 404 | Build output directory 설정. Monorepo면 `apps/live-web` |
| 스타일이 깨진 채로 나옴 | 폰트 CDN(`cdn.jsdelivr.net`, `fonts.googleapis.com`) 차단 여부 |
| 이미지가 안 보임 | 파일명 대소문자. Cloudflare는 구분하고 Windows는 구분하지 않음 |
| 수정했는데 반영이 안 됨 | Pages의 **Deployments** 탭에서 최신 커밋이 배포됐는지 확인 |

---

---

## 11. 채널 연동 — 왜 유튜브만 자동인가

채널마다 개방 수준이 다릅니다. 이걸 숨기지 않고 화면과 코드에 그대로 반영했습니다.

| 채널 | 방식 | 근거 |
|---|---|---|
| **유튜브** | API 자동 | Live Streaming API의 `liveBroadcasts.list`로 예약된 방송을 가져올 수 있습니다 |
| **네이버** | 담당자 등록 | 커머스API는 상품·주문·정산용입니다. 쇼핑라이브 방송 조회 API는 공개되지 않았습니다 |
| **카카오** | 담당자 등록 | 공개 API 없음 |
| **틱톡** | 승인 후 연동 | TikTok Shop Partner API 이용에 파트너 승인이 필요합니다 |

`_headers`만 있는 지금 상태로도 사이트는 완전히 동작합니다. 아래는 **선택 사항**이며,
붙이지 않아도 기존 화면은 그대로입니다.

### 12-1. D1 만들고 연결하기

```bash
npx wrangler d1 create orangeliveon
npx wrangler d1 execute orangeliveon --remote --file=./schema.sql
```

Cloudflare 대시보드 → 프로젝트 → **Settings → Bindings → D1 database** 에서
변수 이름 `DB`, 데이터베이스 `orangeliveon` 로 연결합니다.

연결 전에는 `/api/broadcasts` 가 501을 돌려주고, 홈페이지는 `data.js` 의 정적 데이터로 계속 동작합니다.
**연결에 실패해도 사이트가 깨지지 않는 구조입니다.**

### 12-2. 편성을 API에서 받아오기

`assets/js/data.js` 의 `apiBase` 를 채우면 됩니다.

```js
config: { apiBase: 'https://orangeliveon.com' }
```

`/api/broadcasts` 응답은 `data.js` 의 `broadcasts` 배열과 같은 모양이라 화면 코드를 고칠 필요가 없습니다.
확인(`verified_at`)이 끝난 링크만 `channelLinks` 로 내려가고, 미확인 링크는 화면에서 비활성으로 표시됩니다.

### 12-3. 유튜브 자동 연결

Google Cloud Console에서 OAuth 클라이언트를 만들고, 방송을 올릴 채널 계정으로
`https://www.googleapis.com/auth/youtube` 범위의 refresh token을 한 번 발급받습니다.

Pages → **Settings → Variables and secrets** 에 넣을 값:

| 이름 | 설명 |
|---|---|
| `YT_CLIENT_ID` | OAuth 클라이언트 ID |
| `YT_CLIENT_SECRET` | 시크릿 (Secret으로 저장) |
| `YT_REFRESH_TOKEN` | refresh token (Secret으로 저장) |
| `SYNC_TOKEN` | 동기화 호출용 임의 문자열 (Secret으로 저장) |
| `SALT` | 접수 IP 해시용 임의 문자열 (Secret으로 저장) |

호출은 이렇게 합니다.

```bash
curl -X POST https://orangeliveon.com/api/sync/youtube \
  -H "x-sync-token: <SYNC_TOKEN>"
```

편성표의 날짜·시각과 유튜브 예약 방송의 시각이 일치하면 자동으로 연결됩니다.
Cron으로 10분마다 돌리면 편성표가 알아서 최신 상태를 유지합니다.

### 12-4. 네이버·카카오 링크 등록

담당자가 방송 링크를 확인한 뒤 넣습니다. `verified_at` 이 채워져야 화면에서 링크가 열립니다.

```sql
INSERT INTO broadcast_channels (broadcast_id, channel, watch_url, source, verified_at)
VALUES ('B2610011', 'naver', 'https://shoppinglive.naver.com/lives/000000', 'manual', datetime('now'))
ON CONFLICT(broadcast_id, channel) DO UPDATE
  SET watch_url = excluded.watch_url, verified_at = datetime('now');
```

### 12-5. 폼을 실제 접수로 바꾸기

`assets/js/app.js` 의 `initForms()` 안 주석 자리에서 `/api/leads` 로 POST하면 됩니다.
`kind` 값은 `seller` · `brand` · `studio` · `notify` · `inquiry` 중 하나입니다.

접수 엔드포인트는 개인정보를 다루므로 세 가지를 지킵니다.

- 동의(`agree`) 없이는 저장하지 않습니다
- 광고성 정보 수신은 `marketing` 동의로만 처리합니다
- 접속 IP는 원문 대신 해시만 남깁니다

저장 항목과 보유 기간은 `policy.html` 의 표와 **반드시 일치시켜야 합니다.** 한쪽만 바꾸면 고지 위반이 됩니다.

---

## 12. 셀러 매출 시뮬레이터

`assets/js/sim.js` 상단 `MODEL` 객체에 계수가 모여 있습니다.
실제 사업 조건이 정해지면 이 값들을 바꿔주세요.

| 값 | 현재 | 성격 |
|---|---|---|
| `reach` | 네이버 90 / 틱톡 70 / 유튜브 55 / 카카오 40 | 신규 셀러 초기 회당 고유 시청자 추정 |
| `chDecay` | 0.65 | 채널을 늘려도 시청자가 단순 합산되지 않는 점 반영 |
| `cvr` | 4% / 7% / 11% | 업계 평균 5~10%보다 보수적으로 |
| `feeRate` | 12% | **가정값** — 실제 수수료로 교체 필요 |
| `logisticsPerOrder` | 3,000원 | **가정값** — 실제 물류 단가로 교체 필요 |
| `mode.*.cost` | 9만 / 62만 / 72만 | 스튜디오 요금표 기준 |

**이 도구는 셀러를 설득하는 계산기가 아닙니다.** 조건이 안 맞으면 적자를 적자로 보여주고,
손익분기 시청자 수를 알려줍니다. 계수를 낙관적으로 바꾸면 도구의 신뢰가 무너지니 주의해 주세요.
화면에도 추정치이며 매출을 보증하지 않는다는 문구를 고정으로 띄웁니다.

---


---

## 14. SEO — 네이버·구글 최적화

### 적용한 것

| 항목 | 내용 |
|---|---|
| title / description | 페이지마다 개별 작성. 네이버가 선호하는 title 40자·description 80자 안팎에 맞췄습니다 |
| keywords | 네이버가 아직 참고하는 항목이라 페이지별로 넣었습니다 |
| canonical | 확장자 없는 주소(`/schedule`)로 통일했습니다. Cloudflare가 `.html`을 그리로 보내므로 중복 색인이 생기지 않습니다 |
| 구조화 데이터 | Organization · WebSite · BreadcrumbList를 전 페이지에, FAQPage(고객지원) · Service(스튜디오)를 추가로 넣었습니다 |
| sameAs | 그룹 6개 사이트를 연결해 같은 사업체 묶음임을 알립니다 |
| og:image | `assets/img/og-image.jpg` (1200×630). 카카오톡·네이버 공유 시 이 이미지가 뜹니다 |
| robots.txt | 네이버 `Yeti`, 다음 `Daum`, `Googlebot`을 명시하고 `/api/`만 차단했습니다 |
| sitemap.xml | lastmod·changefreq·priority 포함, 대표 이미지도 등록했습니다 |

### 반드시 직접 해야 하는 일

**1. 사이트 소유확인 코드 넣기** — 전 페이지 `<head>`에 빈 채로 넣어뒀습니다.

```html
<meta name="naver-site-verification" content="">
<meta name="google-site-verification" content="">
```

- 네이버: [서치어드바이저](https://searchadvisor.naver.com) → 사이트 등록 → HTML 태그 방식 → 발급된 값을 `content`에 붙여넣기
- 구글: [서치 콘솔](https://search.google.com/search-console) → 속성 추가 → HTML 태그 방식

**2. 사이트맵 제출** — 두 곳 모두에 `https://orangeliveon.com/sitemap.xml` 을 등록합니다.
네이버는 서치어드바이저 → 요청 → 사이트맵 제출, 구글은 서치 콘솔 → Sitemaps 입니다.

**3. 네이버 비즈니스 등록** — 네이버는 검색 결과에서 자체 서비스 데이터를 우선합니다.
스마트플레이스에 사업장을 등록하면 "화성 라이브커머스 스튜디오" 같은 지역 검색에서 노출이 크게 달라집니다.

**4. 도메인 연결 후 확인** — Cloudflare Custom domains에 `orangeliveon.com` 을 연결하고,
`www` 로도 들어오면 하나로 모으도록 리다이렉트 규칙을 걸어주세요. 둘 다 열려 있으면 색인이 갈라집니다.

### 노리는 키워드

| 페이지 | 주력 키워드 |
|---|---|
| 홈 | 라이브커머스, 오렌지 라이브커머스, 라이브 방송 편성표 |
| 편성표 | 라이브커머스 편성표, 쇼핑라이브 일정, 네이버 쇼핑라이브 일정 |
| 셀러 센터 | 라이브커머스 입점, 셀러 모집, 라이브커머스 수수료, 라이브커머스 대행 |
| 스튜디오 | 라이브커머스 스튜디오, 스튜디오 대관, 화성·동탄 방송 스튜디오 |
| 물류·보관 | 라이브커머스 풀필먼트, 공유창고, 물류대행, 3PL |

지역 키워드(화성·동탄)는 경쟁이 낮고 전환이 높은 편이라 스튜디오 페이지에 함께 넣었습니다.

### 앞으로 순위를 끌어올리려면

검색 순위는 기술 설정만으로 올라가지 않습니다. 지금 구조에서 가장 효과가 큰 순서는 이렇습니다.

1. **방송이 실제로 쌓이는 것** — 편성표에 방송이 계속 올라오면 색인 대상 페이지가 늘고 신선도 점수가 붙습니다
2. **다시보기 공개** — 영상 페이지는 체류시간이 길어 검색엔진이 좋아합니다
3. **그룹 사이트 상호 링크** — 6개 사이트가 서로를 링크하면 도메인 신뢰도가 함께 올라갑니다. 지금은 이쪽에서만 걸어둔 상태이니 반대 방향도 걸어주세요
4. **셀러 사례 콘텐츠** — "라이브커머스 어떻게 시작하나요" 같은 실무 글이 검색 유입의 핵심입니다

---

## 15. 로컬에서 확인하기

빌드가 필요 없으므로 정적 서버만 있으면 됩니다.

```bash
python3 -m http.server 8080
# 또는
npx serve .
```

`file://` 로 직접 열면 `broadcast.html?id=` 쿼리 처리와 일부 스크립트가 정상 동작하지 않습니다.
반드시 로컬 서버를 통해 확인해 주세요.
