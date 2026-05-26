namespace DocumentResearch.Api.Auth;

public static class ErrorTypes
{
    private const string BaseUri = "https://api.docresearch.local/";

    public const string InvalidRequest = BaseUri + "errors/invalid-request";
    public const string GoogleTokenInvalid = BaseUri + "errors/google-token-invalid";
    public const string EmailNotVerified = BaseUri + "errors/email-not-verified";
    public const string UserNotProvisioned = BaseUri + "errors/user-not-provisioned";
    public const string UserLocked = BaseUri + "errors/user-locked";
    public const string DocumentNotFound = BaseUri + "errors/document-not-found";
}
