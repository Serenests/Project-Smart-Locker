//Smart-locker-API/server.js
const express = require('express');
const app = express();
const cors = require('cors');
const {authenticateToken, requireSystemAdmin, requireOrganizeAdmin, requireDepartmentAdmin, requireDepartmentAdminOnly, requireAnyUser} = require('./middleware/auth'); //auth middleware

const PORT = 3001;

// Import controllers
const { UserController } = require('./controllers/UserController'); //usercontroller
const { UserLockerGrantController } = require('./controllers/UserLockerGrantContoller'); //userlockergrantcontroller
const { ProductController } = require('./controllers/ProductController'); //productcontroller
const { GroupLocationController } = require('./controllers/GroupLocationController'); //grouplocationcontroller
const { LocationController } = require('./controllers/LocationController'); //locationcontroller
const { LockerController } = require('./controllers/LockerController'); //lockercontroller
const { SlotController } = require('./controllers/SlotController'); //slotcontroller
const { SlotStockController } = require('./controllers/SlotStockController'); //slotstockcontroller
const { CameraController } = require('./controllers/CameraController'); //cameracontroller
const { DashboardController } = require('./controllers/DashboardController');
const { LockerProvisionController } = require('./controllers/LockerProvisionController'); //lockerprovisioncontroller
const { TransactionController } = require('./controllers/TransactionController'); //transactioncontroller
const { TransactionDetailController } = require('./controllers/TransactionDetailController'); //transactiondetailcontroller
const { SyncController } = require('./controllers/SyncController'); //synccontroller
const { SnapshotController } = require('./controllers/SnapshotController'); //snapshotcontroller

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//User routes
app.post('/auth/signin', UserController.signIn); //SignIn route
app.post('/auth/register', UserController.register); //Register route
app.post('/user/deleteUser', authenticateToken, requireSystemAdmin, UserController.deleteUser); //Delete route
app.post('/user/editUser', authenticateToken, requireDepartmentAdmin, UserController.editUser); //Edit route
// app.get('/user/getAllUsers', UserController.getAllUsers);
app.get('/user/getAllUsers', authenticateToken, requireDepartmentAdmin,UserController.getAllUsers
);
// สำหรับ Report
app.get('/user/getUsersByLocation', authenticateToken, requireDepartmentAdmin, UserController.getUsersByLocation);
app.get('/user/getUsersByGroup', authenticateToken, requireOrganizeAdmin, UserController.getUsersByGroup);


//UserLockerGrant routes
app.post('/userLockerGrant/createUserLockerGrant',authenticateToken, requireDepartmentAdmin, UserLockerGrantController.createUserLockerGrant); //Create UserLockerGrant route
app.post('/userLockerGrant/updateUserLockerGrant', authenticateToken, requireDepartmentAdmin, UserLockerGrantController.updateUserLockerGrant); //Update UserLockerGrant route
app.post('/userLockerGrant/deleteUserLockerGrant', authenticateToken, requireDepartmentAdmin, UserLockerGrantController.deleteUserLockerGrant); //Delete UserLockerGrant route
app.get('/userLockerGrant/getAllUserLockerGrant', authenticateToken, requireDepartmentAdmin, UserLockerGrantController.getAllUserLockerGrant); //Get All UserLockerGrant route
app.get('/userLockerGrant/sync/users', LockerController.verifyLocker, SyncController.syncUsers); //Sync UserLockerGrant route

//Product routes
app.post('/product/createProduct', authenticateToken, requireDepartmentAdminOnly, ProductController.createProduct); //Create Product route
app.post('/product/deleteProduct',authenticateToken, requireSystemAdmin, ProductController.deleteProduct); //Delete Product route
app.post('/product/updateProduct', authenticateToken, requireDepartmentAdminOnly, ProductController.editProduct);//Update Product route
app.get('/product/getAllProducts', authenticateToken, requireAnyUser, ProductController.getAllProducts); //Get All Product route
app.get("/product/sync/products",LockerController.verifyLocker,SyncController.syncProducts); //Sync UserLockerGrant route

//GroupLocation routes
app.post('/grouplocation/createGrouplocation', authenticateToken, requireSystemAdmin, GroupLocationController.createGroupLocation); //Create GroupLocation route
app.post('/grouplocation/updateGrouplocation', authenticateToken, requireSystemAdmin, GroupLocationController.editGroupLocation); //Edit GroupLocation route
app.post('/grouplocation/deleteGrouplocation', authenticateToken, requireSystemAdmin, GroupLocationController.deleteGroupLocation); //Delete GroupLocation route
app.get('/grouplocation/getAllGrouplocations', authenticateToken, requireSystemAdmin, GroupLocationController.getAllGroupLocations); //Get All GroupLocation route
app.get('/grouplocation/getAllGrouplocationforRegister', GroupLocationController.getAllGroupLocations); //Get All GroupLocation route
app.get('/grouplocation/getGrouplocationById/:group_location_id', authenticateToken, requireOrganizeAdmin, GroupLocationController.getGroupLocationById); //Get GroupLocation by ID route


//Location routes
app.post('/location/createLocation', authenticateToken, requireOrganizeAdmin, LocationController.createLocation); //Create Location route
app.post('/location/updateLocation', authenticateToken, requireOrganizeAdmin, LocationController.editLocation); //Edit Location route
app.post('/location/deleteLocation', authenticateToken, requireOrganizeAdmin, LocationController.deleteLocation); //Delete Location route
app.get('/location/getAllLocations', authenticateToken, requireSystemAdmin, LocationController.getAllLocations); //Get All Location route
app.get('/location/getLocationsByGroup', authenticateToken, requireOrganizeAdmin, LocationController.getLocationsByGroupLocationId);
app.get('/location/getLocationsByGroupforRegister', LocationController.getLocationsByGroupLocationId);

//Locker routes
app.post('/locker/createLocker', authenticateToken, requireSystemAdmin, LockerController.createLocker); //Create Locker route
app.post('/locker/updateLocker', authenticateToken, requireSystemAdmin, LockerController.editLocker); //Edit Locker route
app.post('/locker/deleteLocker', authenticateToken, requireSystemAdmin, LockerController.deleteLocker); //Delete Locker route
app.get('/locker/getAllLockers', authenticateToken, requireDepartmentAdmin, LockerController.getAllLockers); //Get All Locker route
app.get('/locker/getLockersByLocationId/:location_id', authenticateToken, requireDepartmentAdmin, LockerController.getLockersByLocationId); //Get Lockers by Location ID route
app.get('/locker/getLockerByGroupLocationId/:group_location_id', authenticateToken, requireOrganizeAdmin, LockerController.getLockerByGroupLocationId);
// ✅ เพิ่ม Route ใหม่สำหรับดึงเฉพาะ Locker ที่ activated
app.get('/locker/getActivatedLockersByLocationId/:location_id', authenticateToken, requireDepartmentAdmin, LockerController.getActivatedLockersByLocationId);
app.get('/locker/getLockerDontHaveProvision', authenticateToken, requireSystemAdmin, LockerController.getLockerDontHaveProvision); //Get Locker by ID route
app.post('/locker/heartbeat', LockerController.verifyLocker, LockerController.lockerHeartbeat); //Locker Heartbeat route

//Locker Provision routes
app.post('/lockerProvision/createProvision', authenticateToken, requireSystemAdmin, LockerProvisionController.createProvision); //Create Locker Provision route
app.post('/lockerProvision/updateProvision', authenticateToken, requireSystemAdmin, LockerProvisionController.updateProvision); //Edit Locker Provision route
app.post('/lockerProvision/deleteProvision', authenticateToken, requireSystemAdmin, LockerProvisionController.deleteProvision); //Delete Locker Provision route
app.get('/lockerProvision/getAllProvisions', authenticateToken, requireSystemAdmin, LockerProvisionController.getAllProvisions); //Get All Locker Provision route
app.get('/lockerProvision/getProvisionByCode/:provision_code', LockerProvisionController.getLockerProvisionByCode); //Get Locker Provision by code route

//Slot routes
app.post('/slot/createSlot', SlotController.createSlot);  //Create Slot route
app.post('/slot/updateSlot', SlotController.editSlot); //Edit Slot route
app.post('/slot/deleteSlot', SlotController.deleteSlot); //Delete Slot route
app.get('/slot/getAllSlot', SlotController.getAllSlot); //Get All Slot route
app.get('/slot/getSlotsByLockerId/:locker_id', SlotController.getSlotsByLockerId);
app.get('/slot/sync/slots',LockerController.verifyLocker,SyncController.synSlots); //Sync Slot route

//SlotStock routes
app.post('/slotStock/createSlotStock', SlotStockController.createSlotStock);  //Create SlotStock route
app.post('/slotStock/updateSlotStock', SlotStockController.editSlotStock); //Edit SlotStock route
app.post('/slotStock/deleteSlotStock', SlotStockController.deleteSlotStock); //Delete SlotStock route
app.get('/slotStock/getAllSlotStocks', SlotStockController.getAllSlotStock); //Get All SlotStock route

//Transaction routes
app.post('/transaction/createTransaction', authenticateToken, requireSystemAdmin, TransactionController.createTransaction);
app.post('/transaction/updateTransaction', authenticateToken, requireSystemAdmin, TransactionController.editTransaction);
app.post('/transaction/deleteTransaction', TransactionController.deleteTransaction);
app.get('/transaction/getAllTransactions', authenticateToken, requireSystemAdmin, TransactionController.getAllTransactions);
app.get('/transaction/getTransactionById/:transaction_id', authenticateToken, requireSystemAdmin, TransactionController.getTransactionById);
// ✅ Routes ใหม่
app.get('/transaction/getTransactionsByGroup', authenticateToken, requireOrganizeAdmin, TransactionController.getTransactionsByGroup);
app.get('/transaction/getTransactionsByLocation', authenticateToken, requireDepartmentAdmin, TransactionController.getTransactionsByLocation);
// ✅ Route สำหรับออกใบรีพอร์ต
app.get('/transaction/getReportData', authenticateToken, requireDepartmentAdmin, TransactionController.getReportData);

//สำหรับสร้าง Transaction จาก Locker
app.post('/transaction/createTransactionFromLocker', TransactionController.createTransactionFromLocker);

//Trasaction_detail routes
// Transaction Detail routes
app.post('/transactionDetail/addItemToCart', TransactionDetailController.addItemToCart);
app.get('/transactionDetail/getAllTransactionDetails', TransactionDetailController.getAllTransactionDetails);
app.post('/transactionDetail/confirmTransaction', TransactionDetailController.confirmTransaction);
app.post('/transactionDetail/cancelTransaction', TransactionDetailController.cancelTransaction);
app.post('/transactionDetail/removeItemFromTempCart', TransactionDetailController.removeItemFromTempCart);
app.get('/transactionDetail/getTransactionDetailByTransactionId/:transaction_id', TransactionDetailController.getTransactionDetailByTransactionId);


//Camera routes
app.post('/camera/createCamera', CameraController.createCamera);  //Create Camera route
app.post('/camera/updateCamera', CameraController.editCamera); //Edit Camera route
app.post('/camera/deleteCamera', CameraController.deleteCamera); //Delete Camera route

//Snapshot routes
app.post('/snapshot/saveSnapshot', SnapshotController.saveSnapshot);  //Create Snapshot route
app.get('/snapshot/getSnapshotsByTransaction/:transaction_id', SnapshotController.getSnapshotsByTransaction); //Get Snapshots by Transaction ID route

// เพิ่ม middleware authentication
// Dashboard routes
app.get('/dashboard/count-users', authenticateToken, requireDepartmentAdmin, DashboardController.countUser);
app.get('/dashboard/stats', authenticateToken ,requireDepartmentAdmin, DashboardController.getAllStats);
app.get('/dashboard/transactionChart', authenticateToken, requireDepartmentAdmin,DashboardController.getTransactionChartByLocation
);



app.get('/', (req, res) => {
  res.send('Hello from the server!');
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});