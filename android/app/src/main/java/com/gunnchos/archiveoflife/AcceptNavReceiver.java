package com.gunnchos.archiveoflife;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Internal RC helper: adb broadcast to drive Capacitor JS acceptance hooks. */
public class AcceptNavReceiver extends BroadcastReceiver {
  @Override
  public void onReceive(Context context, Intent intent) {
    if (intent == null) return;
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
