package com.bumpinto.adapter.out.apple;

/**
 * TEST-ONLY EC P-256 anahtari. Bir kez uretildi ve buraya gomuldu; hicbir yerde kayitli degil,
 * hicbir Apple hesabina bagli degil. Gercek AuthKey_*.p8 env'den gelir, depoya GIRMEZ.
 */
final class AppleTestKeys {

    static final String EC_P256_PKCS8_PEM = """
            -----BEGIN PRIVATE KEY-----
            MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgczrH0bmedUdHzWEc
            0gVaBdIAsy4P4Q0EpXIwRhT/AEOhRANCAAT89NwE7V4x2LJPv29xmz1B/zoLK1kp
            sARf6jXfgLt+0zgYWl3MZgL26xoo9/+RvWvOcw3Pqfu3NNjSmwJRIfdT
            -----END PRIVATE KEY-----
            """;

    private AppleTestKeys() {
    }
}
