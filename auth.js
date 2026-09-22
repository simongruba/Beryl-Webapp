"use strict";

window.BerylAuth = (() => {
  // Clean up email addresses and usernames.
  function normalize(value) {
    return String(value ?? "").trim().toLowerCase();
  }

  // Beryl has two website roles: admin and student.
  // The database remains the source of truth for the admin account.
  // Every other authenticated Beryl account is normalized to Student.
  async function getAccountRole() {
    const { data, error } = await supabaseClient.rpc("beryl_role");

    if (error) {
      console.warn(
        "Could not load the saved Beryl role; using Student for this account:",
        error.message
      );
      return "student";
    }

    if (data === "admin") return "admin";

    // Keep the database membership synchronized as Student.
    // The companion SQL file installs this safe helper.
    try {
      const { data: ensuredRole, error: ensureError } =
        await supabaseClient.rpc("beryl_ensure_student");

      if (!ensureError && ensuredRole === "admin") return "admin";
      if (ensureError) {
        console.warn("Beryl student-role sync unavailable:", ensureError.message);
      }
    } catch (error) {
      console.warn("Beryl student-role sync unavailable:", error);
    }

    return "student";
  }

  // Prepare the user information displayed on the website.
  function formatUser(user, role) {
    const username =
      user.user_metadata?.username ||
      user.user_metadata?.display_name ||
      user.email?.split("@")[0] ||
      "Berylite";

    return {
      id: user.id,
      email: user.email,
      username: username,
      name: username,
      role: role === "admin" ? "admin" : "student"
    };
  }

  // Create a new account.
  async function register({
    email,
    username,
    password,
    confirmation
  }) {
    email = normalize(email);
    username = normalize(username);

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      email.length > 254
    ) {
      throw new Error("Enter a valid email address.");
    }

    if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
      throw new Error(
        "Use 3–32 letters, numbers, dots, underscores or hyphens for your username."
      );
    }

    if (
      typeof password !== "string" ||
      password.length < 8 ||
      password.length > 128
    ) {
      throw new Error("Use a password of 8–128 characters.");
    }

    if (password !== confirmation) {
      throw new Error("The passwords do not match.");
    }

    const { data, error } =
      await supabaseClient.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            username: username,
            display_name: username,
            class_id: "beryl",
            role: "student"
          }
        }
      });

    if (error) {
      console.error(
        "Beryl sign-up failed:",
        error.message
      );

      throw new Error(error.message);
    }

    if (!data.user) {
      throw new Error("The account could not be created.");
    }

    // Public registration creates a Student account only.
    // Admin is never granted from the public sign-up form.
    // Email confirmation may still be required before sign-in.
    return formatUser(data.user, "student");
  }

  // Sign in to an existing account.
  async function signIn({ email, password }) {
    email = normalize(email);

    if (
      !email ||
      typeof password !== "string" ||
      !password ||
      password.length > 128
    ) {
      throw new Error("Enter your email and password.");
    }

    const { data, error } =
      await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
      });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.user) {
      throw new Error("Login failed.");
    }

    const role = await getAccountRole();

    return formatUser(data.user, role);
  }

  // Sign out.
  async function signOut() {
    const { error } =
      await supabaseClient.auth.signOut();

    if (error) {
      throw new Error(error.message);
    }
  }

  // Restore the signed-in user when the page loads.
  async function getCurrentUser() {
    const { data, error } =
      await supabaseClient.auth.getUser();

    if (error || !data.user) {
      return null;
    }

    const role = await getAccountRole();

    return formatUser(data.user, role);
  }

  return Object.freeze({
    register,
    signIn,
    signOut,
    getCurrentUser
  });
})();
