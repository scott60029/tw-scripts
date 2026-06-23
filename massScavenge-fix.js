/*
 * massScavenge category-fix loader  (v2)
 * ------------------------------------------------------------------
 * 作用：
 *   1. 照常載入 Sophie "Shinko to Kuma" 的原版 massScavenge.js（一字不改、
 *      仍來自原始來源，維持原作者已審查過的邏輯）。
 *   2. 原版載入後，攔截「送出前」組裝搜刮隊的兩個全域陣列 (squad_requests /
 *      squad_requests_premium) 的 push，只放行「真的有派兵」的隊伍，濾掉
 *      unit_counts 兵數加總為 0 的空隊伍。
 *
 * 為什麼這樣修（已比對原版 1140~1185 行確認）：
 *   原版 calculateUnitsPerVillage() 對「鎖住 / 正在掃(scavenging_squad!=null)
 *   / 沒勾選」的類別，haulCategoryRate 設 0 → 分到的 unit_counts = {}（空）。
 *   但實際 push 迴圈只判斷 is_locked == false，於是「正在掃／沒勾」的類別
 *   仍被 push 成「空隊伍」進同一批，送進 scavenge_api 時整批被伺服器打回 ——
 *   表現出來就是「明明有閒置的類別，卻一個都派不出去」。
 *   只要把這些空隊伍濾掉，剩下「有兵」的就能正常送出。
 *
 *   v2 變更：拿掉舊版多餘且有誤殺風險的 enabledCategories 檢查。沒勾的類別
 *   原版本來就給 0 兵 → 一樣會被「空兵濾網」擋掉，不需另外判斷；同時加上
 *   診斷 log（保留/濾掉各幾筆、哪村哪類別），方便排查。
 *
 * 使用方式（quick bar）：
 *   javascript:$.getScript('放這支檔案的 CDN 網址')
 *   例：javascript:$.getScript('https://cdn.jsdelivr.net/gh/scott60029/tw-scripts@main/massScavenge-fix.js')
 * ------------------------------------------------------------------
 */
(function () {
    var ORIGINAL_SRC = 'https://shinko-to-kuma.com/scripts/massScavenge.js';

    $.getScript(ORIGINAL_SRC, function () {
        try {
            // 算一筆隊伍的總兵數
            var troopTotal = function (s) {
                var t = 0;
                if (s && s.candidate_squad && s.candidate_squad.unit_counts) {
                    for (var u in s.candidate_squad.unit_counts) {
                        t += Number(s.candidate_squad.unit_counts[u]) || 0;
                    }
                }
                return t;
            };

            var stats = { kept: 0, dropped: 0 };

            // 把指定陣列的 push 換成「有兵才放行」的版本
            var installFilteredPush = function (arr, label) {
                if (!arr) return false;
                var nativePush = Array.prototype.push;
                arr.push = function (s) {
                    var t = troopTotal(s);
                    if (t > 0) {
                        stats.kept++;
                        return nativePush.call(this, s);
                    }
                    stats.dropped++;
                    console.log('%c[fix] 濾掉空隊伍 → 村 ' + (s && s.village_id) +
                        ' 類別 ' + (s && s.option_id) + ' (' + label + ')',
                        'color:#e0a020;');
                    return this.length;
                };
                return true;
            };

            var a = installFilteredPush(typeof squad_requests !== 'undefined' ? squad_requests : null, 'normal');
            var b = installFilteredPush(typeof squad_requests_premium !== 'undefined' ? squad_requests_premium : null, 'premium');

            if (a && b) {
                console.log('%c[massScavenge] category-fix v2 已套用 — 只送出「有派兵」的隊伍' +
                    '（自動跳過 鎖住／進行中／沒勾／空兵）',
                    'color:#4caf50;font-weight:bold;');
                console.log('%c[fix] 送出後可在 Console 打 fixStats() 看保留/濾掉統計',
                    'color:#4caf50;');
            } else {
                console.warn('[massScavenge] 找不到 squad_requests / squad_requests_premium，' +
                    '修正未套用（原版結構可能已變動）');
            }

            // 隨時查統計
            window.fixStats = function () {
                console.log('%c[fix] 本次保留 ' + stats.kept + ' 筆、濾掉 ' + stats.dropped + ' 筆',
                    'color:#4caf50;font-weight:bold;');
            };
        } catch (e) {
            console.error('[massScavenge] category-fix 套用失敗:', e);
        }
    });
})();
