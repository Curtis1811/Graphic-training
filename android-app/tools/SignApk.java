import com.android.apksig.ApkSigner;
import com.android.apksig.ApkVerifier;

import java.io.File;
import java.io.FileInputStream;
import java.security.KeyStore;
import java.security.PrivateKey;
import java.security.cert.X509Certificate;
import java.util.Collections;

/**
 * Signs an APK with apksig (the library behind the SDK's apksigner tool) and
 * verifies the result.
 *
 * usage: java -cp apksig.jar SignApk.java in.apk out.apk keystore.p12 alias password
 */
public class SignApk {
    public static void main(String[] args) throws Exception {
        if (args.length != 5) {
            System.err.println("usage: SignApk in.apk out.apk keystore.p12 alias password");
            System.exit(2);
        }
        char[] password = args[4].toCharArray();
        KeyStore ks = KeyStore.getInstance("PKCS12");
        try (FileInputStream in = new FileInputStream(args[2])) {
            ks.load(in, password);
        }
        PrivateKey key = (PrivateKey) ks.getKey(args[3], password);
        X509Certificate cert = (X509Certificate) ks.getCertificate(args[3]);

        ApkSigner.SignerConfig signer =
                new ApkSigner.SignerConfig.Builder("CERT", key, Collections.singletonList(cert)).build();
        new ApkSigner.Builder(Collections.singletonList(signer))
                .setInputApk(new File(args[0]))
                .setOutputApk(new File(args[1]))
                .setMinSdkVersion(24)
                // Android 7.0+ (minSdk 24) verifies APK Signature Scheme v2, so the
                // legacy JAR (v1) signature isn't needed.
                .setV1SigningEnabled(false)
                .setV2SigningEnabled(true)
                .build()
                .sign();

        ApkVerifier.Result result = new ApkVerifier.Builder(new File(args[1])).build().verify();
        System.out.println("verified=" + result.isVerified()
                + " v1=" + result.isVerifiedUsingV1Scheme()
                + " v2=" + result.isVerifiedUsingV2Scheme());
        for (ApkVerifier.IssueWithParams e : result.getErrors()) System.err.println("ERROR: " + e);
        if (!result.isVerified()) System.exit(1);
    }
}
