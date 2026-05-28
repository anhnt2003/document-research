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
    public const string InvalidTagColor = BaseUri + "errors/invalid-tag-color";
    public const string TagNotFound = BaseUri + "errors/tag-not-found";
    public const string DuplicateTagLabel = BaseUri + "errors/duplicate-tag-label";
    public const string TagHasChildren = BaseUri + "errors/tag-has-children";
    public const string TagCycle = BaseUri + "errors/tag-cycle";
    public const string PermissionDenied = BaseUri + "errors/permission-denied";
    public const string FileMissing = BaseUri + "errors/file-missing";
    public const string FileTooLarge = BaseUri + "errors/file-too-large";
    public const string UnsupportedMime = BaseUri + "errors/unsupported-mime";
}
