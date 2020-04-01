# Resources 4 Vulnerables

## Getting started

### Backend

Inside the folder `/backend`, create the `.env` file using the keys on the `.env.example` and filling with your local data.

With the node and npm installed: 

```
git clone git@github.com:TiagoGouvea/resources4vulnerables.git
cd resources4vulnerables/backend
npm install
npm start
```

### Frontend
// TBD


## Documentation

### Endpoints
The list of available endpoints can be easily accessed on the folder `/backend/docs/postman` or using [this link](https://documenter.getpostman.com/view/3342022/SzYZ1yrY?version=latest).

### Database
You can easily run a local postgres database using the docker and the docker-compose with the file on the `backend/docs`.

```
cd backend/docs
docker-compose up
```
After this, you need to migrate and seed your database with the base data. On another console:

```
cd backend
npm run migrate
npm run seed
```