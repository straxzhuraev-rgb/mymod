/* =====================================================================
 *  MYMOD — visual.js (ГЛАВНЫЙ МОДУЛЬ МОДА)
 * =====================================================================
 *  Этот скрипт исполняется ВНУТРИ страницы игры. Он работает с её
 *  объектами (game, prf_data, countFPS и т.п.) и добавляет:
 *    - HUD-панель (размер/еда/FPS) поверх игры
 *    - кнопку «М» — открыть окно настроек
 *    - настройки, сохраняемые на сервере через JSONP (config.php)
 *    - «быстрые сообщения» (бинды) — отправка своих фраз в чат
 *
 *  ЗДЕСЬ НЕТ: сбора данных других игроков, телеметрии, обхода
 *  авторизации. Только свои настройки и визуал.
 *
 *  НАСТРОЙКИ ПОД СВОЮ ИГРУ:
 *    MYMOD_SERVER  — адрес сервера мода
 *    MYMOD_KEY     — ключ для хранения настроек на сервере
 *                    (одному игроку — один ключ, например "user1")
 * ===================================================================== */

window.MYMOD = (function () {
  "use strict";

  /* ---------------- НАСТРОЙКИ ---------------- */
  var MYMOD_SERVER = "https://ТВОЙ-ДОМЕН.ru";      // ← ТВОЙ ДОМЕН
  var MYMOD_KEY = "user1";                          // ← ТВОЙ КЛЮЧ ИГРОКА (user1 / user2)
  var MYMOD_VER = "0.1.0";

  var cfg = { hud: true };                          // настройки по умолчанию
  var binds = { name: [], text: [] };               // быстрые сообщения: name[1..8], text[1..8]
  var loaded = false;

  /* ---------------- Техпомощь ---------------- */
  function log() { try { console.log.apply(console, ["[mymod]"].concat([].slice.call(arguments))); } catch (e) {} }
  function hint(msg, color) {
    try {
      if (typeof printHintOnScreen === "function") {
        printHintOnScreen(msg);
        if (color && typeof $ === "function") {
          $("div.hintOnScreen p.text").css({ color: color });
        }
        return;
      }
    } catch (e) {}
    try { alert(msg); } catch (e2) {}
  }

  function serverCall(php, data) {
    if (typeof $ === "undefined" || !$.ajax) { log("jQuery недоступен, пропускаем " + php); return; }
    data = data || {};
    data.Key = MYMOD_KEY;
    $.ajax({
      url: MYMOD_SERVER + "/mod/php/" + php,
      method: "GET",
      dataType: "jsonp",
      crossDomain: true,
      cache: false,
      data: data
    });
  }

  /* --------- Колбэки, которые вызывает сервер (JSONP) --------- */
  window.MYMOD_LOAD = function (serverCfg, ver, sBinds) {
    if (serverCfg && typeof serverCfg === "object") {
      for (var k in serverCfg) if (serverCfg.hasOwnProperty(k)) cfg[k] = serverCfg[k];
    }
    if (sBinds && typeof sBinds === "object") {
      binds.name = sBinds.name || [];
      binds.text = sBinds.text || [];
      updBinds();
    }
    if (ver && ver !== MYMOD_VER) {
      MYMOD_VER = ver;
      hint("Мод обновлён до версии " + ver);
    }
    if (!loaded) log("настройки загружены с сервера");
    loaded = true;
    applyAll();
  };
  window.MYMOD_SAVED = function () { hint("Настройки сохранены", "#77ff77"); };
  window.MYMOD_BINDS_SAVED = function () { hint("Быстрые сообщения сохранены", "#77ff77"); };

  /* ---------------- HUD ---------------- */
  function hudCreate() {
    if (document.getElementById("mymod_hud")) return;
    var h = document.createElement("div");
    h.id = "mymod_hud";
    h.style.cssText = "position:fixed;top:8px;left:8px;z-index:99999;color:#fff;" +
      "font-family:Consolas,monospace;font-size:13px;background:rgba(0,0,0,.45);" +
      "padding:6px 10px;border-radius:8px;pointer-events:none;display:none;";
    document.body.appendChild(h);
  }
  function hudToggle(on) {
    hudCreate();
    var el = document.getElementById("mymod_hud");
    if (el) el.style.display = on ? "block" : "none";
  }
  function hudUpdate() {
    var el = document.getElementById("mymod_hud");
    if (!el || el.style.display === "none") return;
    var txt = "MYMOD " + MYMOD_VER;
    try {
      if (typeof game !== "undefined" && game && game.player) {
        txt += " | Размер: " + Math.round(game.player.size);
        if (game.player.mass !== undefined) txt += " | Еда: " + Math.round(game.player.mass);
        if (game.player.cellsCount !== undefined) txt += " | Клетки: " + game.player.cellsCount;
      }
      if (typeof countFPS !== "undefined" && countFPS && countFPS.fps !== undefined) {
        txt += " | FPS: " + countFPS.fps;
      }
    } catch (e) {}
    el.textContent = txt;
  }

  /* ---------------- Быстрые сообщения (бинды) ---------------- */
  function updBinds() {
    // Отображает названия биндов на HUD-панели (если она есть) — расширяемо.
    // Сама отправка в чат реализуется под конкретную игру (см. sendBind).
  }
  function sendBind(n) {
    // n — номер бинда 1..8. Шаблон: отправка своей фразы в чат игры.
    // Адаптируй вызов под игру: например, game.sendKeyCode или ws.send(...).
    var msg = binds.text[n];
    if (!msg) { hint("Быстрое сообщение " + n + " пустое", "#ff7777"); return; }
    try {
      if (typeof sendFastChat === "function") {
        sendFastChat(msg);
      } else {
        // запасной вариант — вставить текст в поле чата и нажать Enter
        var inp = document.querySelector("#chatInput #msg");
        if (inp) {
          inp.value = msg;
          var ev = document.createEvent("KeyboardEvent");
          ev.initKeyboardEvent("keydown", true, true, window, false, false, false, false, 13, 13);
          inp.dispatchEvent(ev);
        }
      }
      log("отправлен бинд " + n + ": " + msg);
    } catch (e) {}
  }
  window.MYMOD_SEND_BIND = sendBind;

  /* ---------------- Окно настроек ---------------- */
  function openSettings() {
    if (document.getElementById("mymod_win")) return;
    var w = document.createElement("div");
    w.id = "mymod_win";
    w.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);" +
      "z-index:100000;background:#1c1c1c;color:#eee;padding:22px 26px;border-radius:12px;" +
      "border:1px solid #444;font-family:Consolas,monospace;min-width:300px;box-shadow:0 8px 30px rgba(0,0,0,.6);";
    w.innerHTML =
      "<h3 style='margin:0 0 14px;color:#66ccff'>MYMOD</h3>" +
      "<label style='display:block;margin:8px 0'><input type='checkbox' id='mymod_cfg_hud'> Показывать HUD</label>" +
      "<label style='display:block;margin:8px 0'><input type='checkbox' id='mymod_cfg_zoom'> Зум (колесо мыши) + C (приблизить)</label>" +
      "<div style='margin-top:12px;font-size:12px;color:#999'>Версия мода: <span id='mymod_ver'></span></div>" +
      "<div style='margin-top:18px;text-align:right'>" +
      "<button id='mymod_save' style='padding:8px 18px;cursor:pointer;border:none;border-radius:6px;background:#3377ff;color:#fff;font:inherit'>Сохранить</button>" +
      "<button id='mymod_close' style='padding:8px 18px;cursor:pointer;border:none;border-radius:6px;background:#555;color:#fff;font:inherit;margin-left:8px'>Закрыть</button>" +
      "</div>";

    var cbH = w.querySelector("#mymod_cfg_hud");
    var cbZ = w.querySelector("#mymod_cfg_zoom");
    cbH.checked = !!cfg.hud;
    cbZ.checked = !!cfg.zoom;
    w.querySelector("#mymod_ver").textContent = MYMOD_VER;

    w.querySelector("#mymod_save").onclick = function () {
      cfg.hud = cbH.checked;
      cfg.zoom = cbZ.checked;
      applyAll();
      serverCall("setconfig.php", { Id: MYMOD_KEY, Val: cfg.hud ? 1 : 0, Data: JSON.stringify(cfg) });
      closeSettings();
      hint("Настройки сохранены");
    };
    w.querySelector("#mymod_close").onclick = closeSettings;

    document.body.appendChild(w);
  }
  function closeSettings() {
    var w = document.getElementById("mymod_win");
    if (w) w.parentNode.removeChild(w);
  }

  /* ---------------- Зум ---------------- */
  var zoomEnabled = false;
  var zoomHold = false;

  // Мгновенный зум по зажатию клавиши C
  function onKeyDown(e) {
    if (!cfg.zoom) return;
    if (e.key === "c" || e.key === "C" || e.keyCode === 67) {
      zoomHold = true;
      if (typeof camera !== "undefined" && camera && camera.target) {
        camera.target[Z] = (camera.target[Z] || 1) * 0.55; // приблизить
      }
    }
  }
  function onKeyUp(e) {
    if (!cfg.zoom) return;
    if (e.key === "c" || e.key === "C" || e.keyCode === 67) {
      zoomHold = false;
      if (typeof camera !== "undefined" && camera && camera.target) {
        camera.target[Z] = 1; // вернуть нормальный масштаб
      }
    }
  }

  // Зум колесом мыши
  function onWheel(e) {
    if (!cfg.zoom) return;
    if (typeof camera === "undefined" || !camera || !camera.target) return;
    var step = e.deltaY > 0 ? 1.1 : 0.9; // вниз — дальше, вверх — ближе
    var cur = camera.target[Z] || 1;
    var next = cur * step;
    next = Math.max(0.3, Math.min(3, next)); // ограничение, чтобы не улететь
    camera.target[Z] = next;
    if (e.preventDefault) e.preventDefault();
  }

  function initZoom() {
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    document.addEventListener("wheel", onWheel, { passive: false });
    zoomEnabled = !!cfg.zoom;
  }

  /* ---------------- Применение настроек ---------------- */
  function applyAll() {
    hudToggle(!!cfg.hud);
    if (cfg.zoom && !zoomEnabled) {
      zoomEnabled = true;
      initZoom();
    }
  }

  /* ---------------- Кнопка «М» ---------------- */
  function btnCreate() {
    if (document.getElementById("mymod_btn")) return;
    var b = document.createElement("div");
    b.id = "mymod_btn";
    b.textContent = "М";
    b.title = "Мой мод — настройки";
    b.style.cssText = "position:fixed;bottom:14px;right:14px;z-index:99999;cursor:pointer;" +
      "width:34px;height:34px;line-height:34px;text-align:center;border-radius:50%;" +
      "background:#3377ff;color:#fff;font-weight:bold;font-family:Consolas,monospace;" +
      "user-select:none;box-shadow:0 2px 8px rgba(0,0,0,.5);";
    b.onclick = openSettings;
    document.body.appendChild(b);
  }

  /* ---------------- Старт ---------------- */
  function init() {
    hudCreate();
    btnCreate();
    applyAll();
    initZoom();

    // периодический HUD-тик
    setInterval(hudUpdate, 500);

    // загрузить настройки с сервера (JSONP), если доступен jQuery
    setTimeout(function () {
      if (MYMOD_SERVER === "" || MYMOD_SERVER.indexOf("ТВОЙ") !== -1) {
        // сервер ещё не настроен — работаем с локальными настройками (localStorage)
        log("Сервер не настроен — работаем с локальными настройками");
        loaded = true;
        applyAll();
        return;
      }
      if (typeof $ !== "undefined" && $.ajax) {
        serverCall("config.php", {});
      } else {
        log("jQuery не найден — работаем с локальными настройками");
        loaded = true;
        applyAll();
      }
    }, 800);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
  setTimeout(init, 2000); // дублёр на случай поздней вставки

  return {
    openSettings: openSettings,
    closeSettings: closeSettings,
    sendBind: sendBind,
    version: function () { return MYMOD_VER; }
  };
})();