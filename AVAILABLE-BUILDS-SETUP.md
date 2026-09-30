# Available Builds setup

The listing manager uses Supabase for admin authentication, listing data, and photo storage. The public Available Builds page only reads listings marked available. Checkout is not included; customers can contact you about a build.

## 1. Create a Supabase project

Create a project in Supabase and note its project URL and public anon/publishable key. In **Authentication → Providers**, keep email/password sign-in enabled and disable public sign-ups. Create your own admin user from the Supabase dashboard; do not add a sign-up form to this site.

## 2. Create the database and storage policies

Open the Supabase SQL Editor, paste in `supabase-setup.sql`, and run it. This creates the listing table, restricts listing writes and photo uploads to admin users, and creates a public-read photo bucket with an 8 MB limit and image type restrictions.

In **Authentication → Users**, copy the UUID for your admin user. In the SQL Editor, grant that user listing-admin access, replacing the UUID:

```sql
insert into public.available_build_admins (user_id)
values ('YOUR_AUTH_USER_UUID');
```

Only run this for trusted administrators. The table is protected by row-level security; regular visitors cannot grant themselves access.

## 3. Configure the static site

Edit `supabase-config.js` and replace the two placeholder values:

```js
window.SUPABASE_CONFIG = {
    url: "https://YOUR_PROJECT_ID.supabase.co",
    anonKey: "YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY"
};
```

The URL and anon/publishable key are public browser settings. **Never put a Supabase `service_role` or secret key in this file or anywhere in the website.** The database and storage policies are what protect admin operations.

## 4. Deploy and test

Deploy the whole site folder to a static host that serves HTML, CSS, JavaScript, and SVG files over HTTPS. Open `admin.html` on the deployed domain, sign in with your admin account, and add a test listing. Confirm that it appears on `available-builds.html`, that marking it sold hides it from the public page, and that delete removes both the listing and photo.

The site currently loads Supabase's JavaScript client from jsDelivr, so the deployed site needs internet access to that CDN and to your Supabase project.

Open `admin.html` on your deployed site to manage listings. It is not linked in the main navigation, but the sign-in and database policies still enforce admin access.

## Managing listings

- Add a title, description, price in dollars, and a JPG/PNG/WebP photo no larger than 8 MB, then choose **Publish build**.
- Choose **Mark sold** to hide a listing from the public page without deleting its record. Choose **Make available** to relist it.
- Choose **Delete** to permanently remove a listing and its uploaded photo.
