package com.gunnchos.archiveoflife;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Internal RC helper: adb broadcast to drive Capacitor JS acceptance hooks. */
public class AcceptNavReceiver extends BroadcastReceiver {
  @Override
  public void onReceive(Context context, Intent intent) {
    if (intent == null) return;
    String jsB64 = intent.getStringExtra("js_b64");
    if (jsB64 != null && !jsB64.isEmpty()) {
      MainActivity.evalJs(
          "(async()=>{try{const s=atob('"
              + jsB64.replace("'", "")
              + "');const r=await (0,eval)(s);console.log('[ACCEPT_JS]', typeof r==='string'?r:JSON.stringify(r));}catch(e){console.error('[ACCEPT_JS]',e);}})();");
      return;
    }
    String action = intent.getStringExtra("action");
    if (action == null || action.isEmpty()) action = "start";
    String arg = intent.getStringExtra("arg");
    if (arg == null) arg = "";
    String safeAction = action.replace("\\", "\\\\").replace("'", "\\'");
    String safeArg = arg.replace("\\", "\\\\").replace("'", "\\'");
    MainActivity.evalJs(
        "(async()=>{try{if(window.__aolAccept){await window.__aolAccept('"
            + safeAction
            + "','"
            + safeArg
            + "');}else if(window.__aolStartExpedition){await window.__aolStartExpedition("
            + ("continue".equals(arg) ? "true" : "false")
            + ");}}catch(e){console.error(e);}})();");
  }
}
