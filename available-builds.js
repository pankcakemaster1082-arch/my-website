document.addEventListener('DOMContentLoaded', async () => {
    const status = document.querySelector('#inventory-status');
    const list = document.querySelector('#available-builds-list');
    const emptyState = document.querySelector('#available-empty-state');
    const config = window.SUPABASE_CONFIG;

    if (!config || !config.url || !config.anonKey || config.url.includes('YOUR_PROJECT_ID') || config.anonKey.includes('YOUR_')) {
        status.textContent = 'Online inventory is being set up. Contact us to ask about ready-made pieces.';
        return;
    }

    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
        status.textContent = 'Available builds could not load because the inventory service did not start. Please try again later or contact us.';
        return;
    }

    const client = window.supabase.createClient(config.url, config.anonKey);
    const { data: builds, error } = await client
        .from('available_builds')
        .select('id, title, description, price_cents, image_path')
        .eq('is_available', true)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Could not load available builds:', error.message);
        status.textContent = 'Available builds could not be loaded right now. Please try again later or contact us.';
        return;
    }

    status.hidden = true;
    if (!builds.length) {
        emptyState.hidden = false;
        return;
    }

    const bucket = client.storage.from('available-builds');
    builds.forEach((build) => {
        const imageUrl = bucket.getPublicUrl(build.image_path).data.publicUrl;
        const card = document.createElement('article');
        card.className = 'product-card available-build-card';

        const image = document.createElement('img');
        image.src = imageUrl;
        image.alt = build.title;
        image.loading = 'lazy';

        const body = document.createElement('div');
        body.className = 'card-body';

        const title = document.createElement('h2');
        title.textContent = build.title;

        const description = document.createElement('p');
        description.textContent = build.description;

        const price = document.createElement('p');
        price.className = 'available-build-price';
        price.textContent = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(build.price_cents / 100);

        const inquire = document.createElement('a');
        inquire.className = 'log-button small';
        inquire.href = 'contact.html#contact-form';
        inquire.textContent = 'Ask about this build';

        body.append(title, description, price, inquire);
        card.append(image, body);
        list.append(card);
    });
});
