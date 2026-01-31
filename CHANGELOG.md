# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.8.0](https://github.com/misty-step/volume/compare/v1.7.1...v1.8.0) (2026-01-30)


### Features

* add Open Graph and Twitter Card metadata ([#307](https://github.com/misty-step/volume/issues/307)) ([4ceab9c](https://github.com/misty-step/volume/commit/4ceab9c7d6e61a39784bc7a43cbc44bbf17a862f))

## [1.7.1](https://github.com/misty-step/volume/compare/v1.7.0...v1.7.1) (2026-01-28)


### Bug Fixes

* make lefthook install graceful for non-git envs (Vercel) ([36e3d90](https://github.com/misty-step/volume/commit/36e3d900e7d8393e563a22f7b3efe6d2983c7a56))

## [1.7.0](https://github.com/misty-step/volume/compare/v1.6.2...v1.7.0) (2026-01-27)


### Features

* **observability:** add PostHog analytics and structured logging ([#296](https://github.com/misty-step/volume/issues/296)) ([7611514](https://github.com/misty-step/volume/commit/7611514cfb4fa10c08589b306b890eb40f17b5ee))


### Bug Fixes

* **stripe:** make admin functions internal-only ([#294](https://github.com/misty-step/volume/issues/294)) ([61086fa](https://github.com/misty-step/volume/commit/61086fa2bebdc5cf536aa6e40fcc08d7f1cfe077))

## [1.6.2](https://github.com/misty-step/volume/compare/v1.6.1...v1.6.2) (2026-01-25)


### Bug Fixes

* **ai:** handle OpenAI SDK browser environment error in tests ([#291](https://github.com/misty-step/volume/issues/291)) ([0934545](https://github.com/misty-step/volume/commit/093454516b30ec33830cf7fc34c8ce2066cecb2d))

## [1.6.1](https://github.com/misty-step/volume/compare/v1.6.0...v1.6.1) (2026-01-24)


### Bug Fixes

* **stripe:** subscription audit fixes and improvements ([#271](https://github.com/misty-step/volume/issues/271)) ([ce83be4](https://github.com/misty-step/volume/commit/ce83be473b33dd6c0a150f8a413876e6be98d82e))
* **version:** use semantic version for footer release link ([9de3fdc](https://github.com/misty-step/volume/commit/9de3fdc285050f48c63e21e7bc1a1a3061f5abd8))

## [1.6.0](https://github.com/misty-step/volume/compare/v1.5.1...v1.6.0) (2026-01-19)


### Features

* add useUndoableAction hook for centralized undo pattern ([#263](https://github.com/misty-step/volume/issues/263)) ([9cb4d06](https://github.com/misty-step/volume/commit/9cb4d06a5fac595848c8a810f6444cfc08e4bd4b))

## [1.5.1](https://github.com/misty-step/volume/compare/v1.5.0...v1.5.1) (2026-01-17)


### Bug Fixes

* **a11y:** remove empty heading that confused screen readers ([#193](https://github.com/misty-step/volume/issues/193)) ([#260](https://github.com/misty-step/volume/issues/260)) ([f66e424](https://github.com/misty-step/volume/commit/f66e42402ee7a31b2d487e964d297bfc5afdf76d))

## [1.5.0](https://github.com/misty-step/volume/compare/v1.4.0...v1.5.0) (2026-01-17)


### Features

* Add CSV data export for workout history ([#258](https://github.com/misty-step/volume/issues/258)) ([ef9d3a0](https://github.com/misty-step/volume/commit/ef9d3a07aa27b7cf980df8a06077400d59473a42))

## [1.4.0](https://github.com/misty-step/volume/compare/v1.3.1...v1.4.0) (2026-01-17)


### Features

* add undo to delete operations ([#254](https://github.com/misty-step/volume/issues/254)) ([0d6f119](https://github.com/misty-step/volume/commit/0d6f119b3c86acb94f558e9b9cdae1328d60012b))

## [1.3.1](https://github.com/misty-step/volume/compare/v1.3.0...v1.3.1) (2026-01-17)


### Bug Fixes

* adjust test thresholds and fix pre-push hook race ([a55865c](https://github.com/misty-step/volume/commit/a55865cbd831c2f9461c632afa15c672c95aa6e6))

## [1.3.0](https://github.com/misty-step/volume/compare/v1.2.0...v1.3.0) (2026-01-16)


### Features

* add Stripe subscription paywall with free trial ([#181](https://github.com/misty-step/volume/issues/181)) ([#239](https://github.com/misty-step/volume/issues/239)) ([3fc90c5](https://github.com/misty-step/volume/commit/3fc90c5bfd957e223f401f41f3fc2bc0c8ca3b3e))


### Bug Fixes

* remove invalid customer_creation param from subscription checkout ([23113a0](https://github.com/misty-step/volume/commit/23113a0156a1310a34e632b376df0608a4dc5a90))
* resolve post-checkout race condition in PaywallGate ([c77612b](https://github.com/misty-step/volume/commit/c77612b9984f133fb839457f8519aa5ff6a03b0d))

## [1.2.0](https://github.com/misty-step/volume/compare/v1.1.0...v1.2.0) (2026-01-11)


### Features

* **testing:** add unit tests for coverage verifier ([#234](https://github.com/misty-step/volume/issues/234)) ([5186283](https://github.com/misty-step/volume/commit/5186283b3397c30c8a95770625f2b9d3b6eb5f09))

## [1.1.0](https://github.com/misty-step/volume/compare/v1.0.0...v1.1.0) (2026-01-09)


### Features

* **ux:** add spinner and loading text for AI exercise classification ([#164](https://github.com/misty-step/volume/issues/164)) ([#229](https://github.com/misty-step/volume/issues/229)) ([5fd086c](https://github.com/misty-step/volume/commit/5fd086c43bea6ba0fe6ea38dab3f80f18e0436fa))


### Bug Fixes

* validate muscle groups against canonical list ([#230](https://github.com/misty-step/volume/issues/230)) ([cc6be1d](https://github.com/misty-step/volume/commit/cc6be1d1143d8ccfe672f5ad6d3028a363c1b5c3))

## 1.0.0 (2026-01-02)


### Features

* 100% automated deployment via Sentry API + CLI ([287bfd5](https://github.com/misty-step/volume/commit/287bfd52bbc27f14574af4ae9fde1c7b6667e677))
* add 2px ring-offset to focus system for clarity ([fbfd3d3](https://github.com/misty-step/volume/commit/fbfd3d334f2ec79d2d8878fd2d63325a0a1362a8))
* add 360° rotation to SetCard repeat button on click ([ebe3e9b](https://github.com/misty-step/volume/commit/ebe3e9b82a5a432fa9a61374f7f010542693f26d))
* add 4px focus rings for number inputs ([8ed04be](https://github.com/misty-step/volume/commit/8ed04be7383279a5ead602ba9d1a4bb2e5832928))
* add aiReports table to Convex schema ([6eee2df](https://github.com/misty-step/volume/commit/6eee2dfd6cbf553bfc3d60b34839f16f0e61c5d9))
* add Analytics tab to bottom navigation ([4d3fb96](https://github.com/misty-step/volume/commit/4d3fb96179e2ad632063971ee9322adfdab52eb1))
* add automated deployment script for observability stack ([51bc465](https://github.com/misty-step/volume/commit/51bc46595719bbd299695b08631a84ca51eeabf9))
* add chrome accent system to design tokens ([7c254ad](https://github.com/misty-step/volume/commit/7c254ad64d6d3e38d3d24c1182a28dab1d4abf25))
* Add comprehensive Lefthook quality gates ([#69](https://github.com/misty-step/volume/issues/69)) ([875deb1](https://github.com/misty-step/volume/commit/875deb18d1d8669d271672de30afa3935d4ea640))
* add deployment environment detection utility ([ec3ab24](https://github.com/misty-step/volume/commit/ec3ab245ad766351bcb1a7bbe9a1359a61ea69d7))
* add empty state for new users on analytics page ([243b489](https://github.com/misty-step/volume/commit/243b4894392d3dd55f5c94c9685bf79e77c57f13))
* add Framer Motion animation system ([b9f8a8d](https://github.com/misty-step/volume/commit/b9f8a8da128f34c9eac16635014a0109d00bdd54))
* add golden ratio entrance animations to SetCard ([ff83cd1](https://github.com/misty-step/volume/commit/ff83cd1b24c8c9cf85d13733cf411ea91b40cfcc))
* add golden ratio PRECISION_TIMING constants ([a0624b4](https://github.com/misty-step/volume/commit/a0624b4001071455969deeb1d38c56a8a5466a76))
* add listSetsForDateRange query for Dashboard optimization ([909b475](https://github.com/misty-step/volume/commit/909b475efdc974e2e8d933b1eb1c87843e242dce))
* add loading spinner to Log Set button ([90a9817](https://github.com/misty-step/volume/commit/90a9817b160e260464075207c902b0618f108069))
* add motionPresets for common animation patterns ([004ef42](https://github.com/misty-step/volume/commit/004ef4209c936a5eeefd4e1fe101ac9f3d1e24a6))
* add on-demand report generation mutation with rate limiting ([1129165](https://github.com/misty-step/volume/commit/1129165d69f6c3b61407ac0eb86a9a9d3adc9976))
* add PR (Personal Record) detection utility ([c148dc8](https://github.com/misty-step/volume/commit/c148dc8c27f6ea7fc34aa7bbd2e1222543bce199))
* add recent PRs query ([11b784a](https://github.com/misty-step/volume/commit/11b784a793d36ae2857d5cf4f6e44a681397e2c4))
* add report query functions ([4a5ea79](https://github.com/misty-step/volume/commit/4a5ea79dd7618d0283f44cda79f208a770e7b83b))
* add Sentry configuration factory with PII scrubbing ([d42dcbc](https://github.com/misty-step/volume/commit/d42dcbc848923cc2b35e9f43273f2dbe4d7e9b00))
* add shadcn core components ([2bde529](https://github.com/misty-step/volume/commit/2bde529d9d791d48b3b7e7e71f6411f750cba12f))
* add shake animation to delete confirmation on cancel ([889b514](https://github.com/misty-step/volume/commit/889b514fb5d70b9a20ae5d4cb0d8257218bed7ea))
* add smart number formatting with K/M suffixes ([260810b](https://github.com/misty-step/volume/commit/260810b2ae1ad27e74692e3e8c4a4f8b9cf26e06))
* add streak statistics query ([0abbbf7](https://github.com/misty-step/volume/commit/0abbbf78845d5368b7162c7ecc14e9e036887de4))
* add support for duration-based exercises ([127da8c](https://github.com/misty-step/volume/commit/127da8c69e23fccc41590f1135ae4810832aabd0))
* add support for duration-based exercises ([bc7097e](https://github.com/misty-step/volume/commit/bc7097eff9701cd0a40a44083586b356fd8a4c58))
* add Vercel Analytics with URL filtering ([a74605a](https://github.com/misty-step/volume/commit/a74605a2d25b430f9c3f4921697fb2d4838de065))
* add version resolution module ([8992ce7](https://github.com/misty-step/volume/commit/8992ce770e55cb04c97a84b2cc1a076a8b39a6cb))
* add volume by exercise analytics query ([f8bca9b](https://github.com/misty-step/volume/commit/f8bca9b0ef8d819ee1ad4bb9b3a653ceb6431baa))
* add workout frequency query for heatmap ([b375399](https://github.com/misty-step/volume/commit/b3753991da3a881cdbd7cdb784624b2b15e55684))
* add zod validation schema for QuickLogForm ([831ac65](https://github.com/misty-step/volume/commit/831ac6505bd5d16b29a78e734ca80a0222081809))
* **analytics:** add email redaction helper ([b917e35](https://github.com/misty-step/volume/commit/b917e35606685d95b5609563dc35da9625bcc200))
* **analytics:** add environment detection helpers ([bb6ed82](https://github.com/misty-step/volume/commit/bb6ed82e31dcc77921675b99fe6dfec0bc57ae56))
* **analytics:** add focus suggestions widget with rule-based recommendations ([ced193a](https://github.com/misty-step/volume/commit/ced193a27b8a1afc81233f158b31e6b722530dc8))
* **analytics:** add muscle group mapping system with comprehensive coverage ([02700a3](https://github.com/misty-step/volume/commit/02700a397d1ec5a50f854eb8aee13a6d89428463))
* **analytics:** add progressive overload backend query ([434ac45](https://github.com/misty-step/volume/commit/434ac451b17fc2af0706f7146fb8e7907860e2ba))
* **analytics:** add progressive overload widget with trend visualization ([69b2dba](https://github.com/misty-step/volume/commit/69b2dba58e0db850396c1bb8995774750038debf))
* **analytics:** add property sanitizer for PII protection ([ced92e1](https://github.com/misty-step/volume/commit/ced92e1b850742dded96e989092657e602359933))
* **analytics:** add recovery dashboard widget with color-coded muscle groups ([cd415bf](https://github.com/misty-step/volume/commit/cd415bf0ba01a48511916f0f4749aef300d01fb7))
* **analytics:** add recovery status tracking with muscle group analysis ([29d359e](https://github.com/misty-step/volume/commit/29d359ee9987399fc9237fee8560b7230ec75adb))
* **analytics:** add report type badge to AI insights card ([ebdb447](https://github.com/misty-step/volume/commit/ebdb44707842d8c6055c60092bef7f5544bbf496))
* **analytics:** add server-side track function loader ([db52fd8](https://github.com/misty-step/volume/commit/db52fd8ea38d656024fffe1c77a2a3a29f7df5aa))
* **analytics:** add user context management ([2557db7](https://github.com/misty-step/volume/commit/2557db7266e233a9f93f83645ffdb733e07e0098))
* **analytics:** apply brutalist design to PR card ([d81ce88](https://github.com/misty-step/volume/commit/d81ce88ff3f6bf12f23f361d4811e007385bc6e3))
* **analytics:** apply brutalist design to streak card ([f9f4b20](https://github.com/misty-step/volume/commit/f9f4b203a25677f8760b6ab6096bc5bd35e468fc))
* **analytics:** complete AI insights dashboard with report navigation ([12d1ec7](https://github.com/misty-step/volume/commit/12d1ec7cf2d9c90c5ca0fbed7a23a9b0c2da7d2f))
* **analytics:** enable full-width layout for analytics page ([8431f7a](https://github.com/misty-step/volume/commit/8431f7aa38c4cbecba489604153f0f591bf8ebb4))
* **analytics:** harden test-analytics surface ([9da45e5](https://github.com/misty-step/volume/commit/9da45e5b84865ad9773fdff32bc1478aa68ce6f2))
* **analytics:** implement 12-column responsive grid layout ([31196d3](https://github.com/misty-step/volume/commit/31196d34fea3428cdb09a3823456de0e3cd360f9))
* **analytics:** implement core trackEvent function ([c233328](https://github.com/misty-step/volume/commit/c233328cc5d9a50eb51451c9e3a968167d706e38))
* **analytics:** implement reportError function ([3c9ca93](https://github.com/misty-step/volume/commit/3c9ca9384398e5c5ae026360bfa06e6b9d36766b))
* **analytics:** instrument ui flows ([fec2026](https://github.com/misty-step/volume/commit/fec2026e3b1d2063865c7b23cf8041ab9d60384d))
* **analytics:** integrate progressive overload widget into analytics page ([bdbbcd5](https://github.com/misty-step/volume/commit/bdbbcd58c69b08e008313b010602554bb5a4edb6))
* **analytics:** integrate recovery dashboard widget into analytics page ([e3ee9bb](https://github.com/misty-step/volume/commit/e3ee9bb9cf95767882a7e39d7151bfa8ec7baec5))
* **app:** integrate timezone sync in ConvexClientProvider ([3b6946b](https://github.com/misty-step/volume/commit/3b6946b2a777e4be3254e012aab170e7550f0845))
* apply chrome accent glow to input focus states ([46f658e](https://github.com/misty-step/volume/commit/46f658edc0d73300093e51fe4d7d7b1b7409a5ce))
* apply chrome glow to card hover states ([dad0246](https://github.com/misty-step/volume/commit/dad0246994675e08fa5b2f0ed60b7d4f8cadce8a))
* apply chrome shadow to button pressed states ([5acbd3b](https://github.com/misty-step/volume/commit/5acbd3b87f2972ae5127e30ab660df13d8c312f1))
* apply golden ratio timing to form focus transitions ([8b51c19](https://github.com/misty-step/volume/commit/8b51c19d3157c7bb3f678843bc82abfccc4228c2))
* **ci:** add Convex validation to prevent deployment failures ([eb6a88a](https://github.com/misty-step/volume/commit/eb6a88ac0883a28c3e0c64f051d662175fd2a6ff))
* **ci:** add coverage reporting to PRs and README badges ([9e9ecc3](https://github.com/misty-step/volume/commit/9e9ecc3c743b009807429277b3b683f325d71fc9))
* **ci:** add E2E smoke tests to CI workflow ([d3701e9](https://github.com/misty-step/volume/commit/d3701e9b299c54c9600b7014b1a2cade0bb6ea76))
* complete brutalist design system transformation ([45e047e](https://github.com/misty-step/volume/commit/45e047e256fc34a95c4c5caf5a7fdd7139c83d19))
* configure Sentry build integration and CSP ([54a19c0](https://github.com/misty-step/volume/commit/54a19c092ef71da0411350d061c334f22cc1da25))
* **convex:** add per-user rate limits for AI endpoints ([#47](https://github.com/misty-step/volume/issues/47)) ([3a5434b](https://github.com/misty-step/volume/commit/3a5434b6eebb076b4d18a8af9b641dd4d92c41bf))
* create AI prompt template module ([9abd3bd](https://github.com/misty-step/volume/commit/9abd3bdca929f33f5f278333faa589e08e9f104c))
* create AI report generation mutation ([90129d8](https://github.com/misty-step/volume/commit/90129d8a3947859e9c98a4a33ec8e692078294a6))
* create AIInsightsCard component ([5c65e07](https://github.com/misty-step/volume/commit/5c65e07bca302b4f7199763ae358052ef0813018))
* create analytics page scaffold ([4bd0e55](https://github.com/misty-step/volume/commit/4bd0e55370d5c6a197477cac55286fbb0d00c513))
* **crons:** add hourly cron for timezone-aware daily reports ([64eb4cc](https://github.com/misty-step/volume/commit/64eb4ccb4ba8d65b1eb4bc6656eb3933bcc63084))
* **crons:** add monthly cron for monthly reports ([016fc74](https://github.com/misty-step/volume/commit/016fc7492991b9a3dad89c31ca9cbd06a5689aed))
* **dashboard:** apply brutalist design to daily stats card ([e6fa339](https://github.com/misty-step/volume/commit/e6fa339c2e6afc064b53fda6ab6516de07d4c3d6))
* **dashboard:** apply hero typography to exercise group totals ([a6f299b](https://github.com/misty-step/volume/commit/a6f299b35cea38c90d9971b9306bd4a08f00f8f4))
* **date-formatters:** extract date grouping module from dashboard-utils ([33cf79c](https://github.com/misty-step/volume/commit/33cf79c472a21420a34a2288be94beb8955929ca))
* **date-utils:** add formatTimeAgo utility with terminal and compact formats ([8cda043](https://github.com/misty-step/volume/commit/8cda0439c6fc66e9b9463e2b0a92bd67963da841))
* **design-system:** add mobile design token system ([75aa090](https://github.com/misty-step/volume/commit/75aa090e46871d89b1118cffa5017c981719138d))
* **design:** convert SetCard buttons to brutalist styling ([b6dea6f](https://github.com/misty-step/volume/commit/b6dea6f5ccabb6c3cca11ed711053e22c3e00927))
* **design:** convert SetCard container to brutalist styling ([3dfa4eb](https://github.com/misty-step/volume/commit/3dfa4eb63fde9c28e03ffa65067af39cd2324273))
* **design:** convert SetCard exercise name to display font ([f6ec354](https://github.com/misty-step/volume/commit/f6ec354d01cb15686dbccbf3408da7f2a2d37cfb))
* **design:** implement brutalist design system and transform core UI ([879316a](https://github.com/misty-step/volume/commit/879316abbb9de216caa472572532616ffeeca09c))
* **design:** transform SetCard weight/reps with dominant typography ([4bcbc45](https://github.com/misty-step/volume/commit/4bcbc4571429cb5ad7038d945c615d78c92de3fc))
* **design:** update SetCard timestamp to monospace uppercase ([c84722e](https://github.com/misty-step/volume/commit/c84722eed789333cce9328620412bd12656dc0c6))
* display app version in footer ([367dd6d](https://github.com/misty-step/volume/commit/367dd6d9fcb10da3ccadf3eab84ac7b1ee4ed22f))
* enhanced analytics and history views ([#64](https://github.com/misty-step/volume/issues/64)) ([7b0571a](https://github.com/misty-step/volume/commit/7b0571a7a4cae9958936f6d4de69b7ccbb41444c))
* **error-boundaries:** add global error boundary ([ec9d8ac](https://github.com/misty-step/volume/commit/ec9d8ac1b0de40f1e430a11569e7067319f34a76))
* **error-boundaries:** add route segment error boundary ([e9ae8f1](https://github.com/misty-step/volume/commit/e9ae8f1db2cadff03dae196f2ba5d2af50b55c9f))
* **exercise-grouping:** extract session grouping module from dashboard-utils ([83c4224](https://github.com/misty-step/volume/commit/83c4224520267037c9d2ee2f4df4507a738168e6))
* **exercise-sorting:** extract exercise ordering module from dashboard-utils ([f9b74b6](https://github.com/misty-step/volume/commit/f9b74b62af601aa16cb1975a359c933db2727a26))
* expand BRUTALIST_TYPOGRAPHY with stat/metric/label sizes ([634cbf7](https://github.com/misty-step/volume/commit/634cbf747bd466b7b5500597f2baea53b798ae7a))
* expose version and automate releases ([60e915f](https://github.com/misty-step/volume/commit/60e915f9ccf52a182e2993da0d2d99bdf666a9d0))
* **gamification:** add PR badge (🏆) to set history ([7815db1](https://github.com/misty-step/volume/commit/7815db167da634c60d66f9056daf55a5ab6f5910))
* **gamification:** add PR celebration toast component ([2ee0adc](https://github.com/misty-step/volume/commit/2ee0adc16799d6fe9d291436669c7d94dcdf7a7a))
* **gamification:** add streak calculation utility ([74c8cfb](https://github.com/misty-step/volume/commit/74c8cfbdca01daed66badbe85c40db0278a7ec09))
* **gamification:** display workout streak in daily stats ([bbd0549](https://github.com/misty-step/volume/commit/bbd05498d4ac89d7158267c1fccc743b56000960))
* **gamification:** integrate PR detection into QuickLogForm ([671d49b](https://github.com/misty-step/volume/commit/671d49b1d943b6acacfc2e3260aa40e5dc5fa028))
* **hooks:** add timezone detection and sync hook ([6c9f9f0](https://github.com/misty-step/volume/commit/6c9f9f034aac2e036d4c9b247510e392fe57acf3))
* implement ActivityHeatmap component for workout frequency ([157c677](https://github.com/misty-step/volume/commit/157c677867356d034d06ce12b3ee0a3894f4b29c))
* implement ContextManager and Clerk integration hook ([39fd001](https://github.com/misty-step/volume/commit/39fd001e579bbb36a8c353d2209eb46e14131a9b))
* implement EventCatalog and linting script ([92cec82](https://github.com/misty-step/volume/commit/92cec8260525b539631931141674b426e9a816bc))
* implement OpenAI integration module ([0ded68a](https://github.com/misty-step/volume/commit/0ded68af644710e8f60f35ce3e21e7512f44f622))
* implement PRCard component for personal records ([ed17c3c](https://github.com/misty-step/volume/commit/ed17c3c7441570dafc1cf612bd2ecfdf8b4db6f8))
* implement SanitizationEngine with PII redaction and size guards ([5537e62](https://github.com/misty-step/volume/commit/5537e6282af779ffe528b418e1140ce84abf803c))
* implement scheduled weekly report generation ([d1d60cc](https://github.com/misty-step/volume/commit/d1d60cc49d0fc4bfe9ea708a4a1320e90c584b82))
* implement server-side analytics instrumentation for Convex ([e039b50](https://github.com/misty-step/volume/commit/e039b50eeec78b230f85e53adddefe098ea9aaf2))
* implement StreakCard component for workout streaks ([d4ad868](https://github.com/misty-step/volume/commit/d4ad86845b494ffa870235bdec7d744ac953f8e5))
* implement TransportRouter with robust tracking and error reporting ([61ac799](https://github.com/misty-step/volume/commit/61ac799d43946ca7f0cffd5e961051de55e033ad))
* implement VolumeChart component with Recharts ([f8f49e7](https://github.com/misty-step/volume/commit/f8f49e7a2cc4c6ca223d163ef932f9808c940616))
* initialize shadcn/ui with New York style ([1479662](https://github.com/misty-step/volume/commit/1479662b33e44076687a943604233d02e176226b))
* **input:** add hero typography scaling on focus ([9bd9f9e](https://github.com/misty-step/volume/commit/9bd9f9e6f708ca2c65f3cf3430f28e5b2b585aa7))
* integrate AI insights into analytics page ([b6a44cb](https://github.com/misty-step/volume/commit/b6a44cbef12700261c71f3f127d91c56d87dc835))
* integrate analytics components into dashboard page ([59e489d](https://github.com/misty-step/volume/commit/59e489dd93359cb0d52ab8a76d95fde13bff3cac))
* integrate analytics into root layout ([a8de907](https://github.com/misty-step/volume/commit/a8de9079a3f248296a14d2d89e5fe5d5b7ad0afd))
* **log-form:** add searchable exercise combobox ([9153017](https://github.com/misty-step/volume/commit/9153017175205ea389eb363c8992b65dfed17e73))
* **marketing:** add benefits and social proof sections ([5c7b046](https://github.com/misty-step/volume/commit/5c7b0468e04cbd6ba24a2e6382b2a735f2006ece))
* **marketing:** add FAQ and final CTA sections ([d37295a](https://github.com/misty-step/volume/commit/d37295afd5e06386624c04a08431754da683120c))
* **marketing:** add hero, navbar, and footer components ([f432904](https://github.com/misty-step/volume/commit/f4329043722042f917a4695cb4b05217254cf0e8))
* **marketing:** add how it works and screens carousel ([23cb761](https://github.com/misty-step/volume/commit/23cb7616c2354c3bd8c88f9f33d51e6c158dfbe9))
* **marketing:** add pricing and waitlist section ([8b6733b](https://github.com/misty-step/volume/commit/8b6733b421ad32614a19103f403ca89460a3cdd5))
* **marketing:** add seo metadata and og image ([88341be](https://github.com/misty-step/volume/commit/88341be8fae14a3ef63f0e6350a4e65226b4701b))
* **marketing:** add testimonials section ([63926e7](https://github.com/misty-step/volume/commit/63926e792a093472d7f81a816d850d050215423d))
* **marketing:** compose new marketing page ([c14ffd5](https://github.com/misty-step/volume/commit/c14ffd531201f4678c10c2b0f1f1746a8b8471fb))
* **marketing:** integrate hero device mock ([47bc90c](https://github.com/misty-step/volume/commit/47bc90cfa3296ea7b39d732117046ffdf07a8a19))
* **marketing:** track page analytics events ([100bb1f](https://github.com/misty-step/volume/commit/100bb1f2626c63f3f0d5b6fd3d651c9cdbe06062))
* mobile UX improvements - touch targets, autofocus, responsive layouts ([0c234af](https://github.com/misty-step/volume/commit/0c234af1c35ce1e400bf1bed107f068d8eeb2985))
* **mobile:** improve exercise editing UX with stacked buttons ([b818f0e](https://github.com/misty-step/volume/commit/b818f0ea05ddf0a7fa22fddc4b0a57833aa3884e))
* **observability:** add health check endpoint for uptime monitoring ([0ee4eeb](https://github.com/misty-step/volume/commit/0ee4eeb3ad7cc6118bddbc30e21b4bc328ee26f7))
* **observability:** add health check, tests, alerts, and release tracking ([999c7b4](https://github.com/misty-step/volume/commit/999c7b4e14b6b438fb227dcf1e8c5e371f2c4fa6))
* **observability:** add Sentry alert automation script ([96ba820](https://github.com/misty-step/volume/commit/96ba82079046a37735bf1236d6137cca20ccfc3a))
* Phase 1 & 2.1 - navigation restructure + hero stats ([96eef93](https://github.com/misty-step/volume/commit/96eef93a7506c56516b760ca7183837c52fc6783))
* quality infrastructure improvements ([#60](https://github.com/misty-step/volume/issues/60)) ([3f99293](https://github.com/misty-step/volume/commit/3f9929351c87ac5190a89b91fcabf4e4fa012bbf))
* redesign footer with legal pages and simplified layout ([0d24090](https://github.com/misty-step/volume/commit/0d24090150f8aa3fd7de318b35af8a1d14d380da))
* replace custom inputs with shadcn Input ([9f0e84c](https://github.com/misty-step/volume/commit/9f0e84cb6b6158d4ca9be315f36a352d58d3aaf7))
* replace terminal CSS with shadcn variables ([a01af6b](https://github.com/misty-step/volume/commit/a01af6bc686d85a944b8524c4c7b7f8baecf3e88))
* **reports:** add reportType filtering to getLatestReport query ([0b3dc46](https://github.com/misty-step/volume/commit/0b3dc46ae15f4f2f9cb25b49beeb53df22748873))
* **reports:** support daily/weekly/monthly report types ([11453ad](https://github.com/misty-step/volume/commit/11453ad7d17b76a58669a666a5c881c5ca2d8e03))
* scaffold analytics module structure ([c685e89](https://github.com/misty-step/volume/commit/c685e89803bcd37721faf036c02af4556558b12a))
* **schema:** add reportType field to aiReports table ([be38bfd](https://github.com/misty-step/volume/commit/be38bfd1e8926786ff6fe519cd28480d51d73240))
* **schema:** add users table for timezone and report preferences ([d9e3879](https://github.com/misty-step/volume/commit/d9e38797d6d0bb67e428513a284f8226679dc59e))
* **scripts:** add production → dev data sync for easy QA ([fb16ec7](https://github.com/misty-step/volume/commit/fb16ec73cbb63b75333decd3073c0834b83f3c0c))
* **settings:** implement iOS-style Settings UI ([937acf5](https://github.com/misty-step/volume/commit/937acf58bc141a1f4833785667ac0bc40153702f))
* smooth scroll to history after logging set ([a905057](https://github.com/misty-step/volume/commit/a90505714f6f19270882404de8bedd4f410fc448))
* **stats-calculator:** extract workout statistics module from dashboard-utils ([dc8c38e](https://github.com/misty-step/volume/commit/dc8c38e489c661035b9bf2c645e2b1f303d2b321))
* switch from IBM Plex Mono to Inter font ([ab95e3b](https://github.com/misty-step/volume/commit/ab95e3bdb6b6e6a6fc7b0e85aeb4f9349e0f15f4))
* **typography:** add number display typography utilities ([bfa3d38](https://github.com/misty-step/volume/commit/bfa3d3856fe8f5e34bc2e405297c0ed7b74f54fc))
* **ui:** add exercise grouping utility ([0dbc146](https://github.com/misty-step/volume/commit/0dbc146d1483607ed10fca1023fe59b8c53da161))
* **ui:** add mobile-optimized button size variants ([3fee654](https://github.com/misty-step/volume/commit/3fee654408d78ab5cd8432ddac75dd06a7f5d741))
* **ui:** add responsive layout to Last Set indicator ([637934b](https://github.com/misty-step/volume/commit/637934b63116af1313a4562cd294bb2752c1f367))
* **ui:** add responsive mobile card layout to DailyStatsCard ([ef58c04](https://github.com/misty-step/volume/commit/ef58c04e1a0d65cb07c97a02eea43c5c628202fb))
* **ui:** add responsive mobile card layout to ExerciseManager ([aed7c73](https://github.com/misty-step/volume/commit/aed7c73e99b82b018dc51c8776f1578dd3f11964))
* **ui:** add responsive spacing to FormItem component ([2219d57](https://github.com/misty-step/volume/commit/2219d574d565dcefe296ce8c98334b12a22709a3))
* **ui:** add touch feedback to button component ([ad36cff](https://github.com/misty-step/volume/commit/ad36cff4fb7bd359c6b3e827e7eeea3d0749830a))
* **ui:** create ExerciseSetGroup component ([419d904](https://github.com/misty-step/volume/commit/419d904c01f55a8364f514d4747417ed42047903))
* **ui:** improve mobile UX for exercise cards and set details ([c038c31](https://github.com/misty-step/volume/commit/c038c311b2d2fd3fe61402c144afa6a116fbd543))
* **ui:** restructure set history by exercise grouping ([eea2e75](https://github.com/misty-step/volume/commit/eea2e75976af8a29287552c96b8ea6079a6c8d08))
* **ui:** update input with mobile-first height and enhanced focus ring ([955502c](https://github.com/misty-step/volume/commit/955502cda394f64387fedcd12137b13bbcf14341))
* **ui:** update select components for mobile touch targets ([e35dd07](https://github.com/misty-step/volume/commit/e35dd072cc3908b68a9ce6e09953a127fd1fb66d))
* update Tailwind config for shadcn ([fecdf37](https://github.com/misty-step/volume/commit/fecdf37af367a36d0881a949012aaae49461c729))
* use listSetsForDateRange in Dashboard for 100x payload reduction ([b34302e](https://github.com/misty-step/volume/commit/b34302ea5889c8e13cb223a6a49ac2f4c92a46b4))
* **users:** add user management mutations with timezone support ([b42e8ce](https://github.com/misty-step/volume/commit/b42e8ce2fa4605ab51f0c445da8b7f6ab4aaaea5))
* **ux:** fix autofocus using Radix onOpenChange event pattern ([8048c99](https://github.com/misty-step/volume/commit/8048c99742657b8a5ede8bc0020a7d3e1063b60f))
* Visual Body Map Widget for Analytics ([#58](https://github.com/misty-step/volume/issues/58)) ([e1bd96c](https://github.com/misty-step/volume/commit/e1bd96c7d7965e80ebcd10abea07f4d5419b824d))
* **weight-utils:** extract weight conversion module from dashboard-utils ([f230bed](https://github.com/misty-step/volume/commit/f230bed2837a815bce082cdc81e9816d560f0ffb))


### Bug Fixes

* add _creationTime field to domain types ([e062698](https://github.com/misty-step/volume/commit/e0626980f04e354e20fe7d3e888b0cf659cea2bf))
* add CLERK_JWT_ISSUER_DOMAIN to E2E test environment ([1beeadf](https://github.com/misty-step/volume/commit/1beeadf925ae666d6c0123aa0cd42089871f4509))
* add missing @radix-ui/react-icons dependency ([1fade1b](https://github.com/misty-step/volume/commit/1fade1b7490a6af96f25a489c134aa51e93f0388))
* add withOptimisticUpdate to useMutation mock ([07ba750](https://github.com/misty-step/volume/commit/07ba75086217245b6653f190138d95285d8ce404))
* address all PR [#27](https://github.com/misty-step/volume/issues/27) review feedback (7 critical/in-scope fixes) ([7a857cc](https://github.com/misty-step/volume/commit/7a857cc17fbee29c4899d93183517d9dca32d504))
* address CodeRabbit review feedback (3 of 4 items) ([d307e77](https://github.com/misty-step/volume/commit/d307e7785adb8eb99983250fa730719076eeb89d))
* address PR [#20](https://github.com/misty-step/volume/issues/20) review feedback ([b248b08](https://github.com/misty-step/volume/commit/b248b08acee02744a26661efa6fb7df5fd055719))
* address PR review feedback for testing infrastructure ([efd4589](https://github.com/misty-step/volume/commit/efd45895c98e7490401838dce762505d4d4155b4))
* address PR[#26](https://github.com/misty-step/volume/issues/26) review feedback - critical bugs and UX improvements ([5ebb355](https://github.com/misty-step/volume/commit/5ebb355be8c9cc5b884581cec1a759300697486f))
* allow metadata routes public access and remove invalid sitemap entry ([f33bdb0](https://github.com/misty-step/volume/commit/f33bdb0895b57def3a43777d5a83bc222d6e6536))
* **analytics:** remove duplicate legend from activity heatmap ([1c0768b](https://github.com/misty-step/volume/commit/1c0768bdffa463bb30a7171d3d1830b882e0f2ea))
* **analytics:** remove orphaned instrumentConvex infrastructure ([8314173](https://github.com/misty-step/volume/commit/8314173fea1e9594929d38e7fcc7ca0f5edbc91c))
* **analytics:** resolve ESM spy issues and improve type safety ([cea67ce](https://github.com/misty-step/volume/commit/cea67ce1cba65e2d393efc81d58e45729103b0a1))
* **analytics:** resolve PR review feedback - P1 + 3 improvements ([74d59d2](https://github.com/misty-step/volume/commit/74d59d28f48d3bf717044b01894ff245acc1bee4))
* **analytics:** stop logging pii from report navigator ([4bdb8ce](https://github.com/misty-step/volume/commit/4bdb8ce51ed884b37b6739a3f43b322c96731921))
* **auth:** prevent timezone sync race condition with Clerk auth ([6dad555](https://github.com/misty-step/volume/commit/6dad5558f683ae85cb378f624e1d8da77ae1f596))
* **ci:** add otel externals for dev server ([e59b9c5](https://github.com/misty-step/volume/commit/e59b9c558a02fa03313c8f888b1c587d8d3e64cf))
* **ci:** add required environment variables for build step ([609659b](https://github.com/misty-step/volume/commit/609659b845ebc90d32e16dae3e3fc205fcc9ecb8))
* **ci:** move E2E tests after build, use pnpm start ([1cb78be](https://github.com/misty-step/volume/commit/1cb78be1e6019c8bbfd37fb3f3f047deadfa10e2))
* **ci:** remove duplicate --run flag from test script ([079a387](https://github.com/misty-step/volume/commit/079a38789ece266f90a713624963c8cf49fe9142))
* **ci:** remove redundant Convex validation step ([d36505f](https://github.com/misty-step/volume/commit/d36505fa175cf3f512f71f021a7d5257d0a053f2))
* **ci:** remove scheduler calls incompatible with convex-test ([05652fc](https://github.com/misty-step/volume/commit/05652fcadef61f51489cf2a2127058cb3d8ca409))
* **ci:** resolve E2E env var issues and robustness ([65f6254](https://github.com/misty-step/volume/commit/65f62547fe974cc7d305bcad002433b84ce242bf))
* **ci:** skip E2E test requiring Playwright auth setup ([6d353f7](https://github.com/misty-step/volume/commit/6d353f785f28173026477628933fa4aa4f6438ef))
* configure Convex to inject NEXT_PUBLIC_CONVEX_URL during build ([2b2b857](https://github.com/misty-step/volume/commit/2b2b857ab75b345665eeb9c446b9955a21220048))
* consolidate toast system and add context-aware focus rings ([ade32a1](https://github.com/misty-step/volume/commit/ade32a166993d0c5fae29f41eb10e63da50f25a7))
* **convex:** remove unused track action importing Node.js deps ([a809165](https://github.com/misty-step/volume/commit/a8091656f111748658f762b7979c259a197ae341))
* correct Convex deployment names in migration script ([5c921f6](https://github.com/misty-step/volume/commit/5c921f65e6547806669f00eccce35080aaa77562))
* correct testMatch pattern in Playwright config ([af7c32d](https://github.com/misty-step/volume/commit/af7c32d3417953bffc454c80067fe783a4caba25))
* **csp:** add Clerk production custom domain to CSP headers ([7eb816d](https://github.com/misty-step/volume/commit/7eb816db5c58cdf12c2b8af7654e2e7fb56fd71b))
* **csp:** allow wildcard Convex domains for preview deployments ([92a6901](https://github.com/misty-step/volume/commit/92a6901f608232c9af50359f531666674df0a340))
* **e2e:** increase test timeouts for CI ([d4e4954](https://github.com/misty-step/volume/commit/d4e495499be0fff1aefd9a2457e59eb5dfe2c81c))
* **e2e:** increase test timeouts to 120s ([81145e7](https://github.com/misty-step/volume/commit/81145e707f246707ca7a1758249e9be876241735))
* eliminate flaky Clerk authentication in E2E tests ([a3f39e2](https://github.com/misty-step/volume/commit/a3f39e2a96812d803bbf9909faf711d2cd41b706))
* **exercises:** convert createExercise to action-based architecture ([132268d](https://github.com/misty-step/volume/commit/132268d4b4855e825b43909afe19ce77da7d4756))
* **exercises:** preserve user casing in exercise names ([8f8f17a](https://github.com/misty-step/volume/commit/8f8f17ab86c0fe4416d8c1d9679039b2aa660b00))
* handle undefined env vars in Playwright config ([f8b6fb2](https://github.com/misty-step/volume/commit/f8b6fb25a1d09d8ce59b67f85102153fc1f79d09))
* match dashboard skeleton to actual content structure ([#156](https://github.com/misty-step/volume/issues/156)) ([0f87b61](https://github.com/misty-step/volume/commit/0f87b61b7147b7c24fcfce534cdb8d9624513929))
* **observability:** address PR review feedback ([103be9a](https://github.com/misty-step/volume/commit/103be9af45ff3ba09681d0da3c6eb8e11b08bd9c))
* **og-image:** use default export per Next.js metadata convention ([94aa857](https://github.com/misty-step/volume/commit/94aa857fe443190ff1d5e8d77d6b672eebd7946e))
* pass Clerk env vars to Playwright webServer ([dd0aaa1](https://github.com/misty-step/volume/commit/dd0aaa19d29797303a05e0d993c7e7d113ac4f65))
* prevent hour-24 edge case in timezone calculation ([552c62a](https://github.com/misty-step/volume/commit/552c62aa76ce485247e336ad01c295494588c44e))
* relax env typing in version resolver ([9cbf6e9](https://github.com/misty-step/volume/commit/9cbf6e9366ebe97289b2c0baf2d67d79676a580e))
* remove deprecated package-name from release-please config ([a316ab8](https://github.com/misty-step/volume/commit/a316ab8e311661353ee061c65b85de944469c9e4))
* remove empty string fallbacks for required env vars ([345b514](https://github.com/misty-step/volume/commit/345b5143191fda7c2049f40796369e953562c310))
* remove unused typography-utils.ts (CodeRabbit critical issue) ([f8a7ab8](https://github.com/misty-step/volume/commit/f8a7ab8c018d4d134f6e4e33fff8a1860cfebafa))
* rename Convex modules to use underscores instead of hyphens ([ee95fae](https://github.com/misty-step/volume/commit/ee95faec946198218c6b3ddae1fdb22fa9facfc7))
* replace hardcoded durations with PRECISION_TIMING in BrutalistProgress ([80709e6](https://github.com/misty-step/volume/commit/80709e6ed00f5d64cebe4c8471cfde5bac18b25e))
* replace hardcoded Tailwind colors with design tokens in focus-suggestions-widget ([6a534f9](https://github.com/misty-step/volume/commit/6a534f9dfee49cfd6a221d76e314c1a1630d4fae))
* replace inline animation with motionPresets in UnauthenticatedLanding ([d558b0e](https://github.com/misty-step/volume/commit/d558b0ebd253b54095f17f3d037ee9335c0c04bf))
* reps input resets when user clears value ([#59](https://github.com/misty-step/volume/issues/59)) ([bcb0c28](https://github.com/misty-step/volume/commit/bcb0c28d43efd78811f5528765be2b18db72508e))
* resolve PR [#30](https://github.com/misty-step/volume/issues/30) review comments from CodeRabbit ([8d757a8](https://github.com/misty-step/volume/commit/8d757a86c2566bd499c0b568f4f112995fdd800d))
* resolve PR review feedback - timezone bugs and type safety ([baf3591](https://github.com/misty-step/volume/commit/baf3591453312460bbbbfe25af0b93bf23485d05))
* resolve production footer showing "vdev" instead of version ([62457e7](https://github.com/misty-step/volume/commit/62457e7a3d9da1f05358b8402a831cd6ec8340bb))
* resolve Sentry type compatibility issues ([80a5588](https://github.com/misty-step/volume/commit/80a55888f148e697b2ba50e5d585fd458f68ad32))
* resolve TypeScript errors and add Analytics to navigation ([2b4071c](https://github.com/misty-step/volume/commit/2b4071c43a230bad46e436791435749ca9247a21))
* resolve TypeScript errors in test infrastructure ([a42583f](https://github.com/misty-step/volume/commit/a42583fce5b62cce9e73dc4df0a6ecffd507f241))
* sanitize request bodies and cookies in Sentry events (2 critical PII leaks) ([791e4b1](https://github.com/misty-step/volume/commit/791e4b1615f641549740e861a701d7f2dc5cba64))
* **schema:** add performedAt field to prs array in AI report schema ([a55574c](https://github.com/misty-step/volume/commit/a55574c411d05db02a7e07770c5cf6a63dcbcb24))
* **scripts:** add validation to export script before destructive import ([2139c72](https://github.com/misty-step/volume/commit/2139c727b60b3f828c22b1caa07ce094ebf188d0))
* show time totals for duration-based sets ([#62](https://github.com/misty-step/volume/issues/62)) ([d409f8b](https://github.com/misty-step/volume/commit/d409f8b63b929b939505d165180b2b45c6a34600))
* **test:** exclude instrumentation wrappers from coverage thresholds ([4d26716](https://github.com/misty-step/volume/commit/4d2671642202ed50a1ff60aa56d0c9d2d2ad321c))
* **test:** exclude type tests and adjust coverage thresholds ([d064a98](https://github.com/misty-step/volume/commit/d064a9853f235feac211967bc5672b99de88d1dd))
* **test:** resolve flaky timestamp comparison in users.test.ts ([80a7b17](https://github.com/misty-step/volume/commit/80a7b1704a5b03f2dedf7098669031af4b051c86))
* **tests:** add deterministic fallback for exercise classification in tests ([dbf4c44](https://github.com/misty-step/volume/commit/dbf4c442c6e485d1df48991b4dbea5a02f773ba1))
* **ui:** remove daily PR badges from set history ([07b1a16](https://github.com/misty-step/volume/commit/07b1a1692d4bebd48eaee374469569d158efe6f6))
* Update dependencies to resolve CVE-2025-64756 ([#45](https://github.com/misty-step/volume/issues/45)) ([e6b8dc6](https://github.com/misty-step/volume/commit/e6b8dc6b58abf958f8f882abc52c6d68403c28e3))
* upgrade from deprecated gpt-4o-mini to GPT-5 mini with reasoning ([931a6df](https://github.com/misty-step/volume/commit/931a6df53aa78153dbcb09434c43f20a21b0ec5f))
* use dev server for E2E tests in CI ([08bfd5f](https://github.com/misty-step/volume/commit/08bfd5f17a1dfd7388a7fce0930fb8703386f2a2))
* use official Clerk pattern for E2E auth and fix CSP ([275c9f5](https://github.com/misty-step/volume/commit/275c9f538c455c1b5838056e9c25721e15235601))
* use specific selector for Today heading in E2E test ([4aac4d1](https://github.com/misty-step/volume/commit/4aac4d11e7ed8fb8a80ec4fc9aa6695b1e99cc34))
* **ux:** restore auto-focus after exercise selection in combobox ([7e809b4](https://github.com/misty-step/volume/commit/7e809b469f356a38e7b3f3549e20bd72b92d50b6))
* workout frequency heatmap showing empty despite activity ([b577fa3](https://github.com/misty-step/volume/commit/b577fa36a27a64522e05e7f4ab984b67031582e8))


### Performance Improvements

* optimize analytics queries with Map lookups (O(n²) → O(n)) ([ea3ad5e](https://github.com/misty-step/volume/commit/ea3ad5e82d81b901d7b86bf47557425e53f42cff))

## [Unreleased]

### Added

- **Mobile-first dashboard redesign**: Complete mobile-first redesign of the Today/Dashboard page focused on making set logging frictionless on mobile devices
  - Responsive exercise selector: Full-screen dialog on mobile, popover on desktop with search and recently-used sorting
  - Optimized mobile layout: Fixed form positioning above bottom nav with proper spacing and scroll behavior
  - Footer cleanup: Hidden on mobile, moved branding/feedback to Settings page About section
  - Improved autofocus: Increased delay (50ms → 100ms) for better reliability on mobile devices
  - Animation polish: Smooth set history card entrance with spring physics
  - Key improvements: Reduced time-to-log from ~15s to <5s, better one-handed operation, history section only scrolls when content overflows

- **Per-user rate limiting**: Added rate limiting for AI-backed endpoints to prevent abuse
  - `exercise:create`: 10 requests/minute (env-configurable)
  - `aiReport:onDemand`: 5 requests/day (env-configurable)
  - Fixed-window rate limiting stored in Convex with automatic expiration

- **Build version display**: Added semantic version display in footer (replaces "vdev" in production)

- **Release automation (release-please)**: Set up automated changelog generation and version management

### Changed

- **Brutalist design system migration**: Complete migration to brutalist design system with 100% compliance
  - Created BRUTALIST_TYPOGRAPHY system with semantic pairings
  - Established PRECISION_TIMING constants using golden ratio (φ ≈ 0.618)
  - Added chrome accent system (chromeHighlight, chromeShadow, chromeGlow)
  - Migrated 7+ major components to typography pairings and motion presets
  - Fixed 35 design system violations across 16 files
  - Eliminated all rounded corners, standardized animation timing

- **UX: Contextual validation errors**: Improved user experience with self-explanatory error messages
  - Validation errors now include recovery hints (e.g., "leave weight empty for bodyweight")
  - Duration validation errors display verbatim instead of falling back to generic messages
  - Delete operations provide consistent feedback through centralized error handling

### Fixed

- **Type safety**: Restored type safety in `useLastSet` hook
- **Security**: Restricted test endpoints in production environment
- **Dependency security**: Updated dependencies to resolve CVE-2025-64756 (glob command injection)

### Performance

- **Dashboard performance**: 100x payload reduction via server-side date filtering (listSetsForDateRange query)
- **Analytics performance**: 20-50x speedup via Map-based lookups (O(n²) → O(n) complexity reduction)
- **AI report generation**: Parallelized exercises query for faster report generation

## [0.1.0] - Initial Release

### Added

- Basic workout tracking with exercises and sets
- Clerk authentication integration
- Convex backend with real-time sync
- Dark mode support
- Mobile-responsive design
- Exercise management (create, list, delete)
- Set logging with reps and optional weight
- Workout history view
- Duration-based exercises support
- AI-powered workout insights
- Analytics and activity calendar
