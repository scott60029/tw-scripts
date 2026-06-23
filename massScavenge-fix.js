/*
 * massScavenge category-fix loader
 * ------------------------------------------------------------------
 * 作用：
 *   1. 照常載入 Sophie "Shinko to Kuma" 的原版 massScavenge.js（一個字都不改、
 *      仍然來自原始來源，維持原作者已審查過的邏輯）。
 *   2. 原版載入後，只攔截「送出前」組裝搜刮隊的兩個全域陣列的 push，
 *      濾掉以下兩種不該送出的隊伍：
 *        (a) option_id 對應的類別「沒有被勾選」(enabledCategories === false)
 *        (b) 該隊伍的 unit_counts 兵數加總為 0（空隊伍）
 *
 * 為什麼這樣修：
 *   原版 calculateHaulCategories() 的推送迴圈只判斷 is_locked，
 *   沒勾選的類別只是被算成 0 兵，但因為「沒鎖」仍會被 push 成空隊伍，
 *   送進 scavenge_api 時造成整批請求被伺服器打回 ——
 *   表現出來就是「明明勾了類別，帶入卻失敗」。
 *
 * 使用方式（quick bar）：
 *   javascript:$.getScript('放這支檔案的網址')
 *
 *   例如放在 GitHub raw：
 *   javascript:$.getScript('https://raw.githubusercontent.com/<帳號>/<repo>/main/massScavenge-fix.js')
 * ------------------------------------------------------------------
 */
(function () {
    // 原版腳本來源（保持不變，沿用已審查過的版本）
    var ORIGINAL_SRC = 'https://shinko-to-kuma.com/scripts/massScavenge.js';

    $.getScript(ORIGINAL_SRC, function () {
        try {
            // 判斷一筆 squad request 是否該真正送出
            var isValidSquad = function (s) {
                if (!s || !s.candidate_squad || !s.candidate_squad.unit_counts) return false;

                // (a) 只送出有勾選的類別。option_id 為 1..4，對應 enabledCategories[0..3]
                if (typeof enabledCategories !== 'undefined'
                    && Array.isArray(enabledCategories)
                    && enabledCategories.length >= 4) {
                    if (enabledCategories[s.option_id - 1] !== true) return false;
                }

                // (b) 兵數加總必須 > 0，過濾空隊伍
                var total = 0;
                for (var u in s.candidate_squad.unit_counts) {
                    total += Number(s.candidate_squad.unit_counts[u]) || 0;
                }
                return total > 0;
            };

            // 把指定陣列的 push 換成「先檢查再放行」的版本
            var installFilteredPush = function (arr) {
                if (!arr) return false;
                arr.push = function (s) {
                    if (isValidSquad(s)) {
                        Array.prototype.push.call(this, s);
                    }
                    return this.length;
                };
                return true;
            };

            // squad_requests 與 squad_requests_premium 在原版中是全域變數，
            // 兩者用「同一個 candidate_squad / option_id」成對 push，
            // 套用相同判斷可保持兩陣列同步、分組(squads / squads_premium)不會錯位。
            var a = installFilteredPush(typeof squad_requests !== 'undefined' ? squad_requests : null);
            var b = installFilteredPush(typeof squad_requests_premium !== 'undefined' ? squad_requests_premium : null);

            if (a && b) {
                console.log('%c[massScavenge] category-fix 已套用 — 只送出已勾選且有兵的類別',
                    'color:#4caf50;font-weight:bold;');
            } else {
                console.warn('[massScavenge] 找不到 squad_requests / squad_requests_premium，' +
                    '修正未套用（原版結構可能已變動）');
            }
        } catch (e) {
            console.error('[massScavenge] category-fix 套用失敗:', e);
        }
    });
})();
