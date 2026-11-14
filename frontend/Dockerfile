FROM nginx:1.30-alpine

ENV NGINX_ENVSUBST_FILTER=^API_UPSTREAM$

COPY public/ /usr/share/nginx/html/
RUN chmod -R a+rX /usr/share/nginx/html/
COPY default.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
