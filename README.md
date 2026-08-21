# 오렌지 라이브 허브 (Orange Live Hub)

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
└── assets/
    ├── css/style.css     디자인 시스템 (약 27KB)
    ├── js/data.js        ★ 콘텐츠 데이터 — 운영자가 고칠 파일
    ├── js/app.js         렌더링·필터·폼 검증
    └── img/              WebP 24종 (총 1.6MB)
```

**운영 중 손댈 파일은 사실상 `assets/js/data.js` 하나입니다.** 나머지는 건드리지 않아도 됩니다.

---

## 3. GitHub 올리기

```bash
cd orange-live-hub

git init
git branch -M main
git add .
git commit -m "오렌지 라이브 허브 고객용 홈페이지 초기 구축"

git remote add origin https://github.com/<계정>/orange-live-hub.git
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

4. **Save and Deploy** → 1분 내로 `orange-live-hub.pages.dev` 가 열립니다.

이후 `main` 브랜치에 push할 때마다 자동 재배포되고, Pull Request에는 미리보기 URL이 붙습니다.

### 도메인 연결

**Custom domains** 탭에서 `live.hmk-holdings.co.kr` 같은 주소를 추가하면 됩니다.
연결 후 `build/shell.py` 와 각 HTML의 `BASE`(`https://orange-live-hub.pages.dev`)를 실제 도메인으로 바꿔야
`canonical`, `og:url`, `sitemap.xml` 이 맞습니다. 전체 치환 한 번이면 됩니다.

```bash
grep -rl "orange-live-hub.pages.dev" . | xargs sed -i 's#https://orange-live-hub.pages.dev#https://live.hmk-holdings.co.kr#g'
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
curl -I https://orangelivehub.pages.dev/schedule       # 200 이면 정상
curl -I https://orangelivehub.pages.dev/schedule.html  # 308 → /schedule (정상)
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

## 11. 로컬에서 확인하기

빌드가 필요 없으므로 정적 서버만 있으면 됩니다.

```bash
python3 -m http.server 8080
# 또는
npx serve .
```

`file://` 로 직접 열면 `broadcast.html?id=` 쿼리 처리와 일부 스크립트가 정상 동작하지 않습니다.
반드시 로컬 서버를 통해 확인해 주세요.
