# Static site served by nginx on port 8080
FROM nginx:1.27-alpine
COPY index.html /usr/share/nginx/html/index.html
RUN sed -i 's/listen\s*80;/listen 8080;/; s/listen\s*\[::\]:80;/listen [::]:8080;/' /etc/nginx/conf.d/default.conf
EXPOSE 8080
