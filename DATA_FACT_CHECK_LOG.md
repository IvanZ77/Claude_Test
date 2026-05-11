# Data Fact Check Log

Updated: 2026-05-11

Scope: recalibrated every city file in `data/cities/` to the app's documented 2 adults + 1 school-age child monthly CNY spending model. Each city's `2a1c` tier thresholds were checked against 2026 cost-of-living/rent index signals and 2025/26 international-school fee ranges where relevant, then expanded mechanically to `1a`, `2a`, and `2a2c` using the existing household multipliers.

Primary references used:

- [Numbeo 2026 Cost of Living Rankings](https://www.numbeo.com/cost-of-living/rankings.jsp), including regional views for Asia, America, Europe, and Oceania.
- [Numbeo China cost-of-living city table, updated May 2026](https://www.numbeo.com/cost-of-living/country_result.jsp?country=China).
- [China Briefing: Cost of Living in China 2026](https://www.china-briefing.com/news/cost-of-living-in-china-2026/).
- [LivingCost Wenzhou 2026](https://livingcost.org/cost/china/wenzhou) and comparable LivingCost/CityCost pages for cities missing full Numbeo city-index rows.
- 2025/26 international-school fee checks for high-education-cost cities, including Singapore fee guides from [KakiList](https://kakilist.com/guides/education/international-schools-cost-singapore), [Tutopiya](https://www.tutopiya.com/blog/international-school-fees/international-schools-singapore-fees/), and [WhereNext](https://getwherenext.com/schools/singapore/insights).

Method notes:

- Thresholds remain broad lifestyle bands, not official statistical budgets. They are tuned for expat/FIRE planning and include rent, education, healthcare, transport, dining, travel, and shopping.
- Cities with private/international-school pressure were kept above pure cost-index scaling.
- `dubai.json`, `singapore.json`, and `sydney.json` had invalid 99% budget splits copied across all tiers; those were replaced with complete 100% category mixes.
- Singapore examples with obvious local inaccuracies were corrected, including Grab instead of Didi and current high-end dining/school names.

| City | Old 2a1c tier starts | Updated 2a1c tier starts | Basis |
| --- | --- | --- | --- |
| 上海 (shanghai) | 12000/25000/55000/120000/280000 | 12000/25000/55000/120000/280000 | Numbeo Asia 2026; China Briefing 2026 |
| 北京 (beijing) | 14000/30000/70000/150000/350000 | 11500/24000/52000/115000/260000 | Numbeo Asia 2026; China Briefing 2026 |
| 深圳 (shenzhen) | 12000/26000/58000/128000/290000 | 11000/23000/50000/110000/250000 | Numbeo Asia 2026; China Briefing 2026 |
| 香港 (hongkong) | 18000/36000/75000/160000/350000 | 22000/44000/95000/210000/480000 | Numbeo Asia 2026; 2025/26 international school fee checks |
| 东京 (tokyo) | 15000/30000/65000/140000/320000 | 14000/28000/60000/130000/300000 | Numbeo Asia 2026; Japan family-cost cross-checks |
| 曼谷 (bangkok) | 10000/20000/45000/100000/230000 | 10000/20000/45000/100000/230000 | Numbeo Asia 2026 |
| 西雅图 (seattle) | 18000/35000/75000/160000/360000 | 18000/36000/85000/185000/420000 | Numbeo America 2026 |
| 纽约 (newyork) | 25000/50000/120000/260000/600000 | 25000/50000/120000/260000/600000 | Numbeo America 2026 baseline |
| 大理 (dali) | 5000/12000/28000/65000/150000 | 5500/12000/28000/60000/130000 | China lower-tier city interpolation; Kunming/Yunnan expat budget checks |
| 清迈 (chiangmai) | 4000/10000/24000/55000/130000 | 6000/12000/28000/60000/130000 | Numbeo Asia 2026 |
| 大阪 (osaka) | 15000/32000/72000/155000/360000 | 11000/22000/48000/105000/240000 | Numbeo Asia 2026; Japan family-cost cross-checks |
| 杭州 (hangzhou) | 10000/22000/48000/105000/240000 | 9000/19000/42000/90000/200000 | Numbeo Asia 2026; China Briefing 2026 |
| 成都 (chengdu) | 8000/18000/40000/88000/200000 | 8000/17000/37000/80000/175000 | Numbeo Asia 2026; China Briefing 2026 |
| 舟山 (zhoushan) | 6000/12000/25000/50000/100000 | 6000/13000/28000/60000/130000 | LivingCost Zhoushan 2026; China city index interpolation |
| 温州 (wenzhou) | 7000/14000/28000/55000/110000 | 7500/16000/34000/73000/160000 | LivingCost Wenzhou 2026; China city index interpolation |
| 福冈 (fukuoka) | 9000/18000/36000/72000/144000 | 9000/18000/40000/85000/190000 | LivingCost/CityCost 2026; Japan country index cross-check |
| 岘港 (danang) | 4000/8000/16000/32000/64000 | 5000/10000/22000/45000/95000 | Numbeo Asia 2026; 2025/26 international school fee check |
| 伦敦 (london) | 12000/24000/48000/96000/192000 | 18000/36000/85000/190000/430000 | Numbeo Europe 2026 |
| 巴黎 (paris) | 11000/22000/44000/88000/176000 | 15000/30000/65000/140000/320000 | Numbeo Europe 2026 |
| 武汉 (wuhan) | 5500/11000/22000/44000/88000 | 7000/15000/32000/70000/150000 | Numbeo Asia 2026; China Briefing 2026 |
| 广州 (guangzhou) | 6000/12000/24000/48000/96000 | 9500/20000/43000/95000/210000 | Numbeo Asia 2026; China Briefing 2026 |
| 新加坡 (singapore) | 12000/25000/55000/120000/280000 | 22000/45000/100000/220000/500000 | Numbeo Asia 2026; Singapore 2025/26 international school fee checks |
| 迪拜 (dubai) | 12000/25000/55000/120000/280000 | 16000/33000/78000/175000/400000 | Numbeo Asia 2026; international school/rent premium check |
| 悉尼 (sydney) | 12000/25000/55000/120000/280000 | 16000/32000/75000/165000/380000 | Numbeo Oceania 2026 |
