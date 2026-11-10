const express = require('express');
const request = require('supertest');
jest.mock('../../lib/prisma', () => ({ user: { findFirst: jest.fn(), create: jest.fn() }, pet: { create: jest.fn() } }));
const prisma = require('../../lib/prisma');
const routes = require('../../routes/dashboard/pets.routes');
const app = express();
app.use(express.json(), (req,res,next) => { req.tenant={tenantId:'test-clinic'};req.access={capabilities:{administration:req.headers['x-test-admin']!=='no'}};next(); }, routes);
const body={name:'Mascota ficticia',type:'dog',ownerPhone:'0000000000',gender:'female',weight:12.5};
beforeEach(()=>{jest.clearAllMocks();prisma.user.findFirst.mockResolvedValue({id:'test-owner'});prisma.pet.create.mockResolvedValue({id:'test-pet',name:body.name,type:'dog'});});
test('persists sex and weight with the resolved owner and tenant',async()=>{
 const response=await request(app).post('/pets').send(body);expect(response.status).toBe(201);
 expect(prisma.pet.create.mock.calls[0][0].data).toMatchObject({gender:'female',weight:12.5,ownerId:'test-owner',tenantId:'test-clinic'});
});
test.each([{gender:'invalid'},{weight:-1},{weight:'12.5'}])('rejects invalid basic values before writes: %p',async invalid=>{
 expect((await request(app).post('/pets').send({...body,...invalid})).status).toBe(400);expect(prisma.user.findFirst).not.toHaveBeenCalled();expect(prisma.pet.create).not.toHaveBeenCalled();
});
test('basic operator cannot write weight, but may record sex and handling alerts',async()=>{
 expect((await request(app).post('/pets').set('x-test-admin','no').send(body)).status).toBe(403);expect(prisma.pet.create).not.toHaveBeenCalled();
 const {weight,...basic}=body;expect((await request(app).post('/pets').set('x-test-admin','no').send({...basic,operationalAlerts:'Alerta ficticia'})).status).toBe(201);
 expect(prisma.pet.create.mock.calls[0][0].data).toMatchObject({gender:'female',weight:null,operationalAlerts:'Alerta ficticia'});
});
