/*
 * Core license validation — C extension.
 *
 * Compile with: python scripts/build-coreval.py
 *
 * Embeds the RSA public key at compile time (cannot be monkey-patched).
 * Provides:
 *   coreval.verify_lic_file(path) -> int
 *     Returns 0 on valid, -1 on invalid.
 *
 * Uses OpenSSL for RSA signature verification (PSS + SHA-256).
 */

#define PY_SSIZE_T_CLEAN
#include <Python.h>
#include <stdint.h>
#include <string.h>
#include <openssl/evp.h>
#include <openssl/pem.h>
#include <openssl/rsa.h>
#include <openssl/sha.h>
#include <openssl/err.h>
#include <openssl/bio.h>
#include <openssl/rsa.h>

/* Public key is embedded at compile time */
#include "embedded_key.h"

static int
base64_decode(const char *src, size_t src_len, unsigned char **out, size_t *out_len)
{
    BIO *b64 = BIO_new(BIO_f_base64());
    BIO *mem = BIO_new(BIO_s_mem());
    if (!b64 || !mem) {
        BIO_free_all(b64);
        BIO_free_all(mem);
        return -1;
    }
    BIO_push(b64, mem);
    BIO_write(mem, src, (int)src_len);
    BIO_flush(mem);

    /* No newlines expected */
    BIO_set_flags(b64, BIO_FLAGS_BASE64_NO_NL);

    size_t max_len = (src_len * 3) / 4 + 4;
    *out = (unsigned char *)OPENSSL_malloc(max_len);
    if (!*out) { BIO_free_all(b64); return -1; }

    *out_len = BIO_read(b64, *out, (int)max_len);
    BIO_free_all(b64);
    if (*out_len <= 0) { OPENSSL_free(*out); return -1; }
    return 0;
}

static int
verify_lic(const char *lic_path)
{
    FILE *fp = fopen(lic_path, "rb");
    if (!fp) return -1;

    /* Read entire file */
    fseek(fp, 0, SEEK_END);
    long fsize = ftell(fp);
    rewind(fp);
    if (fsize <= 0) { fclose(fp); return -1; }

    char *filedata = (char *)OPENSSL_malloc(fsize + 1);
    if (!filedata) { fclose(fp); return -1; }
    size_t nread = fread(filedata, 1, fsize, fp);
    fclose(fp);
    filedata[nread] = '\0';

    /* Parse JSON manually — extract "payload_b64" then base64-decode to get signed bytes */
    char *pld_json = NULL;

    char *ps = strstr(filedata, "\"payload_b64\": \"");
    if (ps) {
        ps += 16; /* skip "payload_b64": " */
        char *p = ps;
        while (*p && *p != '"') p++;
        if (*p != '"') { OPENSSL_free(filedata); return -1; }
        size_t b64len = (size_t)(p - ps);
        /* Decode base64 using shared function */
        unsigned char *pld_raw = NULL;
        size_t pld_len = 0;
        if (base64_decode(ps, b64len, &pld_raw, &pld_len) != 0) {
            OPENSSL_free(filedata); return -1;
        }
        pld_json = (char *)pld_raw;
        pld_json[pld_len] = '\0';
    } else {
        /* Fallback: legacy v2/v3 without payload_b64 — brace-match "payload": */
        ps = strstr(filedata, "\"payload\":");
        if (!ps) { OPENSSL_free(filedata); return -1; }
        ps += 10;
        int bd = 0;
        char *p = ps;
        while (*p) {
            if (*p == '{') bd++;
            else if (*p == '}') { bd--; if (bd == 0) break; }
            p++;
        }
        if (bd != 0) { OPENSSL_free(filedata); return -1; }
        size_t plen = (size_t)(p - ps + 1);
        pld_json = (char *)OPENSSL_malloc(plen + 1);
        if (!pld_json) { OPENSSL_free(filedata); return -1; }
        strncpy(pld_json, ps, plen);
        pld_json[plen] = '\0';
    }

    /* Find signature field */
    char *sig_start = strstr(filedata, "\"signature\": \"");
    if (!sig_start) { OPENSSL_free(filedata); OPENSSL_free(pld_json); return -1; }

    /* Extract base64 signature */
    sig_start += 14; /* skip "signature": " */
    char *sig_end = strchr(sig_start, '"');
    if (!sig_end) { OPENSSL_free(filedata); OPENSSL_free(pld_json); return -1; }
    size_t sig_b64_len = (size_t)(sig_end - sig_start);
    char *sig_b64 = (char *)OPENSSL_malloc(sig_b64_len + 1);
    strncpy(sig_b64, sig_start, sig_b64_len);
    sig_b64[sig_b64_len] = '\0';

    /* Decode signature from base64 */
    unsigned char *sig_raw = NULL;
    size_t sig_len = 0;
    if (base64_decode(sig_b64, sig_b64_len, &sig_raw, &sig_len) != 0) {
        OPENSSL_free(filedata); OPENSSL_free(pld_json);
        OPENSSL_free(sig_b64); return -1;
    }

    /* Load public key */
    BIO *pub_bio = BIO_new_mem_buf(PUBLIC_KEY_PEM, -1);
    if (!pub_bio) {
        OPENSSL_free(filedata); OPENSSL_free(pld_json);
        OPENSSL_free(sig_b64); OPENSSL_free(sig_raw);
        return -1;
    }
    EVP_PKEY *pkey = PEM_read_bio_PUBKEY(pub_bio, NULL, NULL, NULL);
    BIO_free(pub_bio);
    if (!pkey) {
        OPENSSL_free(filedata); OPENSSL_free(pld_json);
        OPENSSL_free(sig_b64); OPENSSL_free(sig_raw);
        return -1;
    }

    /* RSA-PSS verification via low-level RSA operations */
    RSA *rsa = EVP_PKEY_get1_RSA(pkey);
    if (!rsa) { OPENSSL_free(filedata); OPENSSL_free(pld_json); OPENSSL_free(sig_b64); OPENSSL_free(sig_raw); EVP_PKEY_free(pkey); return -1; }

    /* Compute SHA-256 hash of the signed payload */
    unsigned char digest[SHA256_DIGEST_LENGTH];
    SHA256((unsigned char *)pld_json, strlen(pld_json), digest);

    /* Decrypt the signature: EM = RSA public decrypt (no padding) */
    int rsa_size = RSA_size(rsa);
    unsigned char *em = (unsigned char *)OPENSSL_malloc((size_t)rsa_size);
    if (!em) { RSA_free(rsa); OPENSSL_free(filedata); OPENSSL_free(pld_json); OPENSSL_free(sig_b64); OPENSSL_free(sig_raw); EVP_PKEY_free(pkey); return -1; }
    int em_len = RSA_public_decrypt((int)sig_len, sig_raw, em, rsa, RSA_NO_PADDING);

    if (em_len <= 0) {
        RSA_free(rsa); OPENSSL_free(em);
        OPENSSL_free(filedata); OPENSSL_free(pld_json);
        OPENSSL_free(sig_b64); OPENSSL_free(sig_raw); EVP_PKEY_free(pkey);
        return -1;
    }

    /* Verify PSS encoding: mHash is digest, EM is the decrypted signature */
    int ret = RSA_verify_PKCS1_PSS_mgf1(
        rsa, digest, EVP_sha256(), EVP_sha256(),
        em, 32  /* salt length = 32 (SHA-256 digest size) */
    );
    RSA_free(rsa); OPENSSL_free(em);
    OPENSSL_free(filedata); OPENSSL_free(pld_json);
    OPENSSL_free(sig_b64); OPENSSL_free(sig_raw); EVP_PKEY_free(pkey);
    return (ret == 1) ? 0 : -1;
}


/* ========== Python module interface ========== */

static PyObject *
py_verify_lic_file(PyObject *self, PyObject *args)
{
    const char *path;
    if (!PyArg_ParseTuple(args, "s", &path)) {
        return NULL;
    }
    int result = verify_lic(path);
    return PyLong_FromLong(result);
}

static PyMethodDef CoreValMethods[] = {
    {"verify_lic_file", py_verify_lic_file, METH_VARARGS,
     "Verify a .lic file. Returns 0 on success, -1 on failure."},
    {NULL, NULL, 0, NULL}
};

static struct PyModuleDef coreval_module = {
    PyModuleDef_HEAD_INIT,
    "coreval",
    "Core license validation (anti-monkey-patch)",
    -1,
    CoreValMethods,
    NULL, NULL, NULL, NULL
};

PyMODINIT_FUNC
PyInit_coreval(void)
{
    return PyModule_Create(&coreval_module);
}
