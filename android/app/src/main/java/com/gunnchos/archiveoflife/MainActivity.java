package com.gunnchos.archiveoflife;

import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  private static MainActivity instance;

  @Override
  public void onCreate(Bundle savedInstanceState) {
    WebView.setWebContentsDebuggingEnabled(true);
    super.onCreate(savedInstanceState);
    instance = this;
  }

  @Override
  public void onDestroy() {
    if (instance == this) instance = null;
    super.onDestroy();
  }

  public static void evalJs(String js) {
    if (instance == null || js == null || js.isEmpty()) return;
    final Bridge bridge = instance.getBridge();
    if (bridge == null || bridge.getWebView() == null) return;
    instance.runOnUiThread(() -> bridge.getWebView().evaluateJavascript(js, null));
  }
}
