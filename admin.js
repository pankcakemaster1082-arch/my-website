document.addEventListener('DOMContentLoaded', () => {
    const status = document.querySelector('#admin-status');
    const loginSection = document.querySelector('#admin-login');
    const loginForm = document.querySelector('#login-form');
    const dashboard = document.querySelector('#admin-dashboard');
    const buildForm = document.querySelector('#build-form');
    const photoInput = document.querySelector('#build-photo');
    const preview = document.querySelector('#photo-preview');
    const listings = document.querySelector('#admin-listings');
    const config = window.SUPABASE_CONFIG;
    const maxPhotoSize = 8 * 1024 * 1024;
    const allowedPhotoTypes = ['image/jpeg', 'image/png', 'image/webp'];

    const setStatus = (message, isError = false) => {
        status.textContent = message;
        status.classList.toggle('is-error', isError);
    };

    if (!config || !config.url || !config.anonKey || config.url.includes('YOUR_PROJECT_ID') || config.anonKey.includes('YOUR_')) {
        setStatus('Supabase is not configured yet. Follow AVAILABLE-BUILDS-SETUP.md, then add your project URL and public anon key to supabase-config.js.', true);
        loginSection.hidden = true;
        return;
    }

    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
        setStatus('The Supabase client failed to load. Check your internet connection and reload this page.', true);
        loginSection.hidden = true;
        return;
    }

    const client = window.supabase.createClient(config.url, config.anonKey);
    const bucket = client.storage.from('available-builds');

    const updateView = (session) => {
        const signedIn = Boolean(session);
        loginSection.hidden = signedIn;
        dashboard.hidden = !signedIn;
        if (signedIn) {
            loadListings();
        }
    };

    const loadListings = async () => {
        listings.textContent = 'Loading listings…';
        const { data, error } = await client
            .from('available_builds')
            .select('id, title, description, price_cents, image_path, is_available, created_at')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Could not load admin listings:', error.message);
            listings.textContent = `Could not load listings: ${error.message}`;
            setStatus('Your account may not have listing-admin access. Confirm the admin setup steps.', true);
            return;
        }

        listings.replaceChildren();
        if (!data.length) {
            listings.textContent = 'You have not added any builds yet.';
            return;
        }

        data.forEach((build) => {
            const card = document.createElement('article');
            card.className = 'admin-listing';

            const image = document.createElement('img');
            image.src = bucket.getPublicUrl(build.image_path).data.publicUrl;
            image.alt = build.title;
            image.loading = 'lazy';

            const details = document.createElement('div');
            details.className = 'admin-listing-details';
            const title = document.createElement('h3');
            title.textContent = build.title;
            const price = document.createElement('p');
            price.textContent = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
            }).format(build.price_cents / 100);
            const state = document.createElement('p');
            state.className = 'admin-listing-state';
            state.textContent = build.is_available ? 'Available' : 'Marked sold';
            details.append(title, price, state);

            const actions = document.createElement('div');
            actions.className = 'admin-listing-actions';
            const availabilityButton = document.createElement('button');
            availabilityButton.type = 'button';
            availabilityButton.className = 'log-button small';
            availabilityButton.textContent = build.is_available ? 'Mark sold' : 'Make available';
            availabilityButton.addEventListener('click', () => setAvailability(build));

            const deleteButton = document.createElement('button');
            deleteButton.type = 'button';
            deleteButton.className = 'admin-delete-button';
            deleteButton.textContent = 'Delete';
            deleteButton.addEventListener('click', () => deleteBuild(build));
            actions.append(availabilityButton, deleteButton);

            card.append(image, details, actions);
            listings.append(card);
        });
    };

    const setAvailability = async (build) => {
        const nextAvailability = !build.is_available;
        const { error } = await client
            .from('available_builds')
            .update({ is_available: nextAvailability })
            .eq('id', build.id);

        if (error) {
            console.error('Could not update build availability:', error.message);
            setStatus(`Could not update "${build.title}": ${error.message}`, true);
            return;
        }

        setStatus(nextAvailability ? 'Build is available on the public page.' : 'Build was marked sold and hidden from the public page.');
        await loadListings();
    };

    const deleteBuild = async (build) => {
        if (!window.confirm(`Permanently delete "${build.title}" and its photo?`)) {
            return;
        }

        const { error: listingError } = await client
            .from('available_builds')
            .delete()
            .eq('id', build.id);

        if (listingError) {
            console.error('Could not delete build:', listingError.message);
            setStatus(`Could not delete "${build.title}": ${listingError.message}`, true);
            return;
        }

        const { error: photoError } = await bucket.remove([build.image_path]);
        if (photoError) {
            console.error('Listing was deleted, but its photo could not be removed:', photoError.message);
            setStatus(`Listing deleted, but photo cleanup failed: ${photoError.message}`, true);
            await loadListings();
            return;
        }

        setStatus('Build and photo deleted.');
        await loadListings();
    };

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const submitButton = loginForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        setStatus('Signing in…');

        const formData = new FormData(loginForm);
        const { data, error } = await client.auth.signInWithPassword({
            email: formData.get('email'),
            password: formData.get('password')
        });
        submitButton.disabled = false;

        if (error) {
            console.error('Admin sign-in failed:', error.message);
            setStatus(`Could not sign in: ${error.message}`, true);
            return;
        }

        loginForm.reset();
        updateView(data.session);
        setStatus('Signed in.');
    });

    document.querySelector('#sign-out-button').addEventListener('click', async () => {
        const { error } = await client.auth.signOut();
        if (error) {
            console.error('Admin sign-out failed:', error.message);
            setStatus(`Could not sign out: ${error.message}`, true);
            return;
        }
        updateView(null);
        setStatus('Signed out.');
    });

    photoInput.addEventListener('change', () => {
        const file = photoInput.files[0];
        if (!file) {
            preview.removeAttribute('src');
            preview.hidden = true;
            return;
        }
        if (!allowedPhotoTypes.includes(file.type) || file.size > maxPhotoSize) {
            photoInput.value = '';
            preview.removeAttribute('src');
            preview.hidden = true;
            setStatus('Choose a JPG, PNG, or WebP image no larger than 8 MB.', true);
            return;
        }
        preview.src = URL.createObjectURL(file);
        preview.hidden = false;
        setStatus('');
    });

    buildForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!buildForm.reportValidity()) {
            return;
        }

        const submitButton = buildForm.querySelector('button[type="submit"]');
        const file = photoInput.files[0];
        if (!file || !allowedPhotoTypes.includes(file.type) || file.size > maxPhotoSize) {
            setStatus('Choose a JPG, PNG, or WebP image no larger than 8 MB.', true);
            return;
        }

        const title = buildForm.elements.title.value.trim();
        const description = buildForm.elements.description.value.trim();
        const price = Number(buildForm.elements.price.value);
        if (!title || !description || !Number.isFinite(price) || price <= 0) {
            setStatus('Enter a title, description, and a price greater than zero.', true);
            return;
        }

        submitButton.disabled = true;
        setStatus('Uploading photo and publishing build…');
        const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
        const imagePath = `${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await bucket.upload(imagePath, file, {
            contentType: file.type,
            upsert: false
        });

        if (uploadError) {
            submitButton.disabled = false;
            console.error('Could not upload build photo:', uploadError.message);
            setStatus(`Photo upload failed: ${uploadError.message}`, true);
            return;
        }

        const { error: insertError } = await client.from('available_builds').insert({
            title,
            description,
            price_cents: Math.round(price * 100),
            image_path: imagePath
        });

        if (insertError) {
            const { error: cleanupError } = await bucket.remove([imagePath]);
            submitButton.disabled = false;
            console.error('Could not publish build:', insertError.message);
            if (cleanupError) {
                console.error('Could not clean up uploaded photo:', cleanupError.message);
            }
            setStatus(`Build was not published: ${insertError.message}${cleanupError ? ` Photo cleanup also failed: ${cleanupError.message}` : ''}`, true);
            return;
        }

        buildForm.reset();
        preview.removeAttribute('src');
        preview.hidden = true;
        submitButton.disabled = false;
        setStatus('Build published and visible on the Available Builds page.');
        await loadListings();
    });

    client.auth.onAuthStateChange((_event, session) => {
        window.setTimeout(() => updateView(session), 0);
    });
    client.auth.getSession().then(({ data, error }) => {
        if (error) {
            console.error('Could not restore admin session:', error.message);
            setStatus(`Could not restore sign-in: ${error.message}`, true);
            return;
        }
        updateView(data.session);
    });
});
