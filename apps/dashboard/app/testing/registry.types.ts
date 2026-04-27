/**
 * TypeScript types for the window.app testing registry.
 * 
 * The registry provides structured access to critical UI elements and actions
 * for testing purposes. Components register themselves via the useRegisterPageApi hook.
 * 
 * The shape is intentionally dynamic - it changes as pages mount/unmount.
 * Static pages (projectListPage) are typed precisely.
 * Dynamic segments (projectPage[id]) are typed as Record<string, Api | undefined>.
 */

/**
 * SignupPageApi - The signup page (/signup)
 * 
 * Provides methods to interact with the signup form.
 */
export interface SignupPageApi {
  /**
   * Check if the page is fully loaded and ready for interaction
   */
  isReady(): boolean;

  /**
   * Fill in the email field
   */
  inputEmail(email: string): void;

  /**
   * Fill in the password field
   */
  inputPassword(password: string): void;

  /**
   * Fill in the confirm password field
   */
  inputConfirmPassword(password: string): void;

  /**
   * Check if the submit button is enabled (form is valid)
   */
  isSubmitEnabled(): boolean;

  /**
   * Click the submit button to create the account
   */
  pressSubmit(): void;

  /**
   * Get all current validation errors
   */
  getValidationErrors(): Record<string, string>;
}

/**
 * LoginPageApi - The login page (/login)
 * 
 * Provides methods to interact with the login form.
 */
export interface LoginPageApi {
  /**
   * Check if the page is fully loaded and ready for interaction
   */
  isReady(): boolean;

  /**
   * Fill in the email field
   */
  inputEmail(email: string): void;

  /**
   * Fill in the password field
   */
  inputPassword(password: string): void;

  /**
   * Check if the submit button is enabled (form is valid)
   */
  isSubmitEnabled(): boolean;

  /**
   * Click the submit button to log in
   */
  pressSubmit(): void;

  /**
   * Get any general error message displayed on the page
   */
  getGeneralError(): string | null;
}

/**
 * ProjectListPageApi - The projects list page (/projects)
 * 
 * Provides methods to interact with the projects list and trigger common actions.
 */
export interface ProjectListPageApi {
  /**
   * Check if the page is fully loaded and ready for interaction
   */
  isReady(): boolean;

  /**
   * Get all visible project IDs in the current view
   */
  getVisibleProjectIds(): string[];

  /**
   * Click a project card by ID to navigate to that project
   */
  pressProjectItem(params: { id: string }): void;

  /**
   * Open the "create new project" modal
   */
  pressCreateProjectButton(): void;

  /**
   * Check if the create project modal is open
   */
  isCreateProjectModalOpen(): boolean;

  /**
   * Fill in the project name field in the create modal
   */
  inputProjectName(name: string): void;

  /**
   * Click the submit button in the create project modal
   */
  pressCreateProjectSubmit(): void;

  /**
   * Click the cancel button in the create project modal
   */
  pressCreateProjectCancel(): void;

  /**
   * Check if project creation is in progress
   */
  isCreatingProject(): boolean;
}

/**
 * The root window.app interface
 * 
 * Contains all registered page APIs.
 * Static pages (projectListPage) are optional but precisely typed.
 * Dynamic pages are accessed via Record with optional values.
 */
export interface WindowApp {
  signupPage?: SignupPageApi;
  loginPage?: LoginPageApi;
  projectListPage?: ProjectListPageApi;
  
  // Future: add more pages as we build them
  // projectPage?: Record<string, ProjectPageApi | undefined>;
  // environmentPage?: Record<string, EnvironmentPageApi | undefined>;
}

/**
 * Declare the global window.app interface
 */
declare global {
  interface Window {
    app: WindowApp;
  }
}
