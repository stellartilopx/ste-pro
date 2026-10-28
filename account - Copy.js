const authPanel = document.querySelector("#account-auth");
const profilePanel = document.querySelector("#account-profile");
const notice = document.querySelector("#account-notice");
const form = document.querySelector("#account-form");
const submitButton = document.querySelector("#account-submit");
const switchButton = document.querySelector("#account-switch");
let creatingAccount = false;

function showNotice(message, isError = false) {
  notice.textContent = message;
  notice.classList.toggle("is-error", isError);
  notice.hidden = !message;
}

function showSignedOut() {
  profilePanel.hidden = true;
  authPanel.hidden = false;
  document.querySelector("#account-title").textContent = "Welcome back";
}

async function showSignedIn(user) {
  authPanel.hidden = true;
  profilePanel.hidden = false;
  document.querySelector("#account-title").textContent = "Your account";
  document.querySelector("#account-email-display").textContent = user.email || "Customer";
  const adminLink = document.querySelector("#admin-dashboard-link");
  adminLink.hidden = true;

  // The database role check is authoritative; user metadata is never used for access.
  const { data, error } = await window.supabaseClient.rpc("is_admin");
  if (error) {
    showNotice("Signed in. Administrator access could not be checked; the admin dashboard will verify your role separately.", true);
    return;
  }
  if (data === true) adminLink.hidden = false;
  showNotice(data === true ? "You are signed in with an administrator account." : "You are signed in with a customer account.");
}

function updateFormMode() {
  document.querySelector("#account-form-title").textContent = creatingAccount ? "Create your account" : "Sign in";
  submitButton.textContent = creatingAccount ? "Create account" : "Sign in";
  document.querySelector("#account-password").autocomplete = creatingAccount ? "new-password" : "current-password";
  document.querySelector("#account-switch-copy").textContent = creatingAccount ? "Already have an account?" : "New here?";
  switchButton.textContent = creatingAccount ? "Sign in" : "Create an account";
}

switchButton.addEventListener("click", () => {
  creatingAccount = !creatingAccount;
  updateFormMode();
  showNotice("");
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  submitButton.disabled = true;
  showNotice(creatingAccount ? "Creating your account..." : "Signing in...");
  const email = document.querySelector("#account-email").value.trim();
  const password = document.querySelector("#account-password").value;
  try {
    const result = creatingAccount
      ? await window.supabaseClient.auth.signUp({ email, password })
      : await window.supabaseClient.auth.signInWithPassword({ email, password });
    if (result.error) throw result.error;
    if (creatingAccount && !result.data.session) {
      showNotice("Account created. Check your email for the confirmation link, then come back here to sign in.");
      return;
    }
    const user = result.data.user;
    if (creatingAccount) creatingAccount = false;
    if (user) await showSignedIn(user);
  } catch (error) {
    showNotice(`${creatingAccount ? "Unable to create account" : "Sign-in failed"}: ${error.message}`, true);
  } finally {
    submitButton.disabled = false;
    updateFormMode();
  }
});

document.querySelector("#account-logout").addEventListener("click", async () => {
  showNotice("Signing out...");
  const { error } = await window.supabaseClient.auth.signOut();
  if (error) return showNotice(`Unable to sign out: ${error.message}`, true);
  showSignedOut();
  showNotice("You have been signed out.");
});

if (!window.supabaseClient) {
  showSignedOut();
  showNotice(window.supabaseClientError || "Supabase is not configured.", true);
} else {
  window.supabaseClient.auth.getSession().then(({ data, error }) => {
    if (error) throw error;
    if (data.session?.user) return showSignedIn(data.session.user);
    showSignedOut();
  }).catch((error) => { showSignedOut(); showNotice(`Unable to check your session: ${error.message}`, true); });
}
