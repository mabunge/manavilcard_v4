# 만화마을 주민등록증 메이커

모바일 브라우저에서 설문을 입력하면 `Canvas API`로 만화마을 주민등록증 PNG를 생성하는 정적 웹사이트입니다.

## 특징

- GitHub Pages에서 무료 배포 가능
- 별도 서버 / DB 불필요
- 입력 정보와 사진은 사용자의 브라우저 안에서만 처리
- 프로필 사진 3:4 수동 크롭
- 모바일 터치 드래그로 위치 조정
- 확대/축소 슬라이더
- 장르 태그 최대 5개 선택
- 주민 코드 자동 생성
- 랜덤 주민 도장
- PNG 파일 저장

## 폴더 구조

```text
mangamail-resident-card-maker/
├─ index.html
├─ styles.css
├─ README.md
├─ .gitignore
├─ js/
│  └─ app.js
└─ assets/
   └─ README.txt
```

## 로컬에서 실행하기

브라우저에서 `index.html`을 직접 열어도 대부분 동작합니다.

다만 안정적으로 테스트하려면 간단한 로컬 서버를 추천합니다.

Python이 설치되어 있다면:

```bash
python3 -m http.server 8000
```

그 뒤 브라우저에서:

```text
http://localhost:8000
```

## GitHub Pages 배포

1. GitHub에서 새 Repository 생성
2. 이 프로젝트의 파일을 Repository 루트에 업로드
3. Repository의 `Settings`
4. `Pages`
5. `Build and deployment`
6. Source를 `Deploy from a branch`
7. Branch를 `main`, Folder를 `/(root)`로 선택
8. Save

잠시 후 다음과 같은 주소가 생성됩니다.

```text
https://YOUR_ID.github.io/REPOSITORY_NAME/
```

## 디자인 수정

### 기본 색상

`styles.css`의 `:root` 안에서 수정할 수 있습니다.

### 카드 자체 디자인

`js/app.js`에서 아래 함수들이 Canvas 위에 각각의 영역을 그립니다.

- `drawBackground()`
- `drawHeader()`
- `drawPhoto()`
- `drawIdentity()`
- `drawGenres()`
- `drawFavoriteInfo()`
- `drawIntro()`
- `drawContact()`
- `drawResidentCode()`
- `drawStamp()`
- `drawFooter()`

## 주민 번호 관련 주의

이 프로젝트의 `MM-26-001` 형식 코드는 실제 주민등록번호가 아닌 동아리 내부용 가상 식별 코드입니다.

실제 주민등록번호, 전화번호, 주소처럼 민감한 개인정보를 수집하도록 확장하지 않는 것을 권장합니다.

## 다음 확장 후보

- 사진 위치 / 확대 조절 UI
- 카드 디자인 테마 선택
- QR 코드
- Google Sheets / Supabase 연동
- 주민 명부
- 취향 유사도 매칭
- 관리자용 발급번호 자동 관리
