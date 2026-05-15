FROM php:8.2-cli-bookworm

# Allow large uploads (e.g. video for spec answers, max 50MB)
COPY php-upload.ini /usr/local/etc/php/conf.d/99-upload.ini

# System deps + PHP extensions needed by Laravel 12
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    git \
    unzip \
    libzip-dev \
    libonig-dev \
    libxml2-dev \
    libc-client-dev \
    libkrb5-dev \
  && docker-php-ext-configure imap --with-kerberos --with-imap-ssl \
  && docker-php-ext-install \
    imap \
    pdo_mysql \
    mbstring \
    zip \
    xml \
  && rm -rf /var/lib/apt/lists/*

# Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www

EXPOSE 8000

# Default command is overridden by docker-compose.yml
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
