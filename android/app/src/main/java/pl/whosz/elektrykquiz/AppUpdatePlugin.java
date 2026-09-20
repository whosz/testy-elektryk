package pl.whosz.elektrykquiz;

import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Pobiera i instaluje nowy APK bez wychodzenia z aplikacji — inaczej użytkownik
 * musiał ręcznie ściągać plik z GitHuba i znać drogę przez menedżer plików.
 *
 * Pobieranie idzie przez systemowy DownloadManager (nie fetch + zapis base64):
 * APK ma kilka MB, a przepychanie tego jako base64 przez most JS↔natywny
 * obciążałoby WebView bez potrzeby. DownloadManager sam też daje content://
 * URI ważny dla instalatora pakietów, więc nie trzeba osobnego FileProvidera.
 */
@CapacitorPlugin(name = "AppUpdate")
public class AppUpdatePlugin extends Plugin {

    @PluginMethod
    public void getAppInfo(PluginCall call) {
        try {
            PackageManager pm = getContext().getPackageManager();
            PackageInfo info = pm.getPackageInfo(getContext().getPackageName(), 0);
            JSObject ret = new JSObject();
            ret.put("versionName", info.versionName);
            long code = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
                ? info.getLongVersionCode()
                : info.versionCode;
            ret.put("versionCode", code);
            call.resolve(ret);
        } catch (PackageManager.NameNotFoundException e) {
            call.reject("Nie udało się odczytać wersji aplikacji", e);
        }
    }

    /** Instalacja spoza sklepu wymaga jawnej zgody użytkownika na to konkretne źródło. */
    @PluginMethod
    public void checkInstallPermission(PluginCall call) {
        JSObject ret = new JSObject();
        boolean granted = Build.VERSION.SDK_INT < Build.VERSION_CODES.O
            || getContext().getPackageManager().canRequestPackageInstalls();
        ret.put("granted", granted);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestInstallPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        }
        call.resolve();
    }

    @PluginMethod
    public void startDownload(PluginCall call) {
        String url = call.getString("url");
        if (url == null) {
            call.reject("Brak adresu URL");
            return;
        }
        DownloadManager dm = (DownloadManager) getContext().getSystemService(Context.DOWNLOAD_SERVICE);
        DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
        request.setTitle("Elektryk Quiz — aktualizacja");
        request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
        request.setMimeType("application/vnd.android.package-archive");
        request.setDestinationInExternalFilesDir(getContext(), Environment.DIRECTORY_DOWNLOADS, "aktualizacja.apk");
        // stara aktualizacja mogła zostać po nieudanym poprzednim pobraniu
        java.io.File old = new java.io.File(
            getContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "aktualizacja.apk"
        );
        if (old.exists()) old.delete();

        long id = dm.enqueue(request);
        JSObject ret = new JSObject();
        ret.put("downloadId", id);
        call.resolve(ret);
    }

    @PluginMethod
    public void getDownloadStatus(PluginCall call) {
        long id = call.getLong("downloadId", -1);
        if (id < 0) {
            call.reject("Brak downloadId");
            return;
        }
        DownloadManager dm = (DownloadManager) getContext().getSystemService(Context.DOWNLOAD_SERVICE);
        DownloadManager.Query query = new DownloadManager.Query().setFilterById(id);
        try (Cursor cursor = dm.query(query)) {
            JSObject ret = new JSObject();
            if (!cursor.moveToFirst()) {
                ret.put("status", "unknown");
                call.resolve(ret);
                return;
            }
            int statusCol = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS));
            int soFar = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR));
            int total = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES));
            ret.put("bytesDownloaded", soFar);
            ret.put("bytesTotal", total);
            switch (statusCol) {
                case DownloadManager.STATUS_SUCCESSFUL:
                    ret.put("status", "complete");
                    break;
                case DownloadManager.STATUS_FAILED:
                    int reason = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_REASON));
                    ret.put("status", "failed");
                    ret.put("reason", reason);
                    break;
                case DownloadManager.STATUS_PAUSED:
                    ret.put("status", "paused");
                    break;
                case DownloadManager.STATUS_PENDING:
                    ret.put("status", "pending");
                    break;
                default:
                    ret.put("status", "running");
            }
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void installApk(PluginCall call) {
        long id = call.getLong("downloadId", -1);
        if (id < 0) {
            call.reject("Brak downloadId");
            return;
        }
        DownloadManager dm = (DownloadManager) getContext().getSystemService(Context.DOWNLOAD_SERVICE);
        Uri uri;
        try {
            uri = dm.getUriForDownloadedFile(id);
        } catch (Exception e) {
            call.reject("Pobrany plik jest niedostępny — pobierz aktualizację ponownie", e);
            return;
        }
        if (uri == null) {
            call.reject("Pobrany plik jest niedostępny — pobierz aktualizację ponownie");
            return;
        }
        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(uri, "application/vnd.android.package-archive");
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_GRANT_READ_URI_PERMISSION);
        getContext().startActivity(intent);
        call.resolve();
    }
}
