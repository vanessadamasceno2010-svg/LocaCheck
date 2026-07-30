package br.com.locacheck.app;

import android.content.Context;
import android.net.Uri;
import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.getcapacitor.BridgeActivity;

import java.nio.charset.StandardCharsets;

public class MainActivity extends BridgeActivity {
    private WebView reportWebView;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().addJavascriptInterface(
                    new LocaCheckAndroidBridge(),
                    "LocaCheckAndroid"
            );
        }
    }

    private boolean isOfficialLocaCheckPage() {
        if (getBridge() == null || getBridge().getWebView() == null) {
            return false;
        }

        String currentUrl = getBridge().getWebView().getUrl();
        if (currentUrl == null) {
            return false;
        }

        String host = Uri.parse(currentUrl).getHost();
        return "loca-check.vercel.app".equalsIgnoreCase(host);
    }

    private final class LocaCheckAndroidBridge {
        @JavascriptInterface
        public void printHtml(String encodedHtml, String requestedJobName) {
            if (encodedHtml == null || encodedHtml.length() > 8_000_000) {
                return;
            }

            final byte[] decodedBytes;
            try {
                decodedBytes = Base64.decode(encodedHtml, Base64.DEFAULT);
            } catch (IllegalArgumentException error) {
                return;
            }

            final String html = new String(decodedBytes, StandardCharsets.UTF_8);
            final String jobName = requestedJobName == null || requestedJobName.trim().isEmpty()
                    ? "LocaCheck - Consulta"
                    : requestedJobName.trim();

            runOnUiThread(() -> {
                if (!isOfficialLocaCheckPage()) {
                    return;
                }

                if (reportWebView != null) {
                    reportWebView.destroy();
                }

                reportWebView = new WebView(MainActivity.this);
                reportWebView.getSettings().setJavaScriptEnabled(false);
                reportWebView.setWebViewClient(new WebViewClient() {
                    private boolean printStarted = false;

                    @Override
                    public void onPageFinished(WebView view, String url) {
                        if (printStarted) {
                            return;
                        }
                        printStarted = true;

                        PrintManager printManager =
                                (PrintManager) getSystemService(Context.PRINT_SERVICE);
                        PrintDocumentAdapter printAdapter =
                                view.createPrintDocumentAdapter(jobName);

                        printManager.print(
                                jobName,
                                printAdapter,
                                new PrintAttributes.Builder().build()
                        );
                    }
                });
                reportWebView.loadDataWithBaseURL(
                        "https://loca-check.vercel.app/",
                        html,
                        "text/html",
                        "UTF-8",
                        null
                );
            });
        }
    }

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

    @Override
    public void onDestroy() {
        if (reportWebView != null) {
            reportWebView.destroy();
            reportWebView = null;
        }
        super.onDestroy();
    }
}
