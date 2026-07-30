package br.com.locacheck.app;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onBackPressed() {
        if (getBridge() != null
                && getBridge().getWebView() != null
                && getBridge().getWebView().canGoBack()) {
            getBridge().getWebView().goBack();
            return;
        }

        super.onBackPressed();
    }
}
