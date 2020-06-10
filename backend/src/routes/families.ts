import express from 'express';
import logging from '../utils/logging';
import * as familyModel from '../models/families';
import * as consumptionModel from '../models/consumptions';

const router = express.Router({ mergeParams: true });

/**
 * Search of family by NIS number
 */
router.get('/', async (req, res) => {
  try {
    if (!req.user?.cityId) throw Error('User without selected city');
    let item;
    if (req.query.nis) {
      item = await familyModel.findByNis(req.query.nis as string, req.user.cityId, true);
      const balance = await consumptionModel.getFamilyDependentBalance(item);
      res.send({ ...item.toJSON(), balance });
    } else item = await familyModel.getAll();
    res.send(item);
  } catch (error) {
    logging.error(error);
    res.status(500).send(error.message);
  }
});

/**
 * Family dashboard
 */
router.get('/dashboard', async (req, res) => {
  try {
    if (!req.user?.cityId) throw Error('User without selected city');
    const data = await familyModel.getDashboardInfo(req.user.cityId);
    res.send(data);
  } catch (error) {
    logging.error(error);
    res.status(500).send(error.message);
  }
});

/**
 * Upload CSV file with family list
 */
router.post('/file', async (req, res) => {
  try {
    if (!req.user?.cityId) throw Error('User without selected city');
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).send('No files were uploaded.');
    }
    let file = req.files.file;
    if (Array.isArray(file)) {
      file = file[0];
    }
    const data = await familyModel.importFamilyFromCSVFile(file.tempFilePath, req.user.cityId);
    return res.send(data);
  } catch (error) {
    logging.error(error);
    return res.status(error.status || 500).send(error.message);
  }
});

/**
 * Upload CSV file with sislame list and family list
 */
router.post('/file-sislame', async (req, res) => {
  try {
    if (!req.user?.cityId) throw Error('User without selected city');

    // Check if another import is in progress
    const status = familyModel.getImportReport(req.user.cityId);
    if (status.inProgress) {
      return res.status(403).send('Another import already running.');
    }
    // Check files
    if (!req.files || !req.files.sislame || !req.files.families || !req.files.nursery) {
      return res.status(400).send('No files were uploaded.');
    }
    let sislameFile = req.files.sislame;
    if (Array.isArray(sislameFile)) {
      sislameFile = sislameFile[0];
    }
    let familyFile = req.files.families;
    if (Array.isArray(familyFile)) {
      familyFile = familyFile[0];
    }
    let nurseryFile = req.files.nursery;
    if (Array.isArray(nurseryFile)) {
      nurseryFile = nurseryFile[0];
    }
    // Files ok, send uploaded
    res.send({ uploaded: true });

    // Run the import function, the status will be monitored using the report function/route
    await familyModel.importFamilyFromCadAndSislameCSV(
      familyFile.tempFilePath,
      sislameFile.tempFilePath,
      nurseryFile.tempFilePath,
      req.user.cityId
    );
    return;
  } catch (error) {
    logging.error(error);
    return res.status(error.status || 500).send(error.message);
  }
});

/**
 * Get CSV import status
 */
router.get('/import-status', async (req, res) => {
  try {
    if (!req.user?.cityId) throw Error('User without selected city');
    const data = familyModel.getImportReport(req.user.cityId);
    return res.send(data);
  } catch (error) {
    logging.error(error);
    return res.status(error.status || 500).send(error.message);
  }
});

/**
 * Sub-route to POST a new item
 */
router.post('/', async (req, res) => {
  try {
    if (!req.user?.cityId) throw Error('User without selected city');
    const item = await familyModel.createFamilyWithDependents(req.body, req.user?.cityId);
    res.send(item);
  } catch (error) {
    logging.error(error);
    res.status(500).send(error.message);
  }
});

/**
 * Sub-route to PUT an existing item
 */
router.put('/:id', async (req, res) => {
  try {
    if (!req.user?.cityId) throw Error('User without selected city');
    const item = await familyModel.updateById(req.params.id, req.body);
    res.send(item);
  } catch (error) {
    logging.error(error);
    res.status(500).send(error.message);
  }
});

/**
 * Sub-rote to GET the file with all the families and balances
 */
router.get('/list-file', async (req, res) => {
  try {
    if (!req.user?.cityId) throw Error('User without selected city');
    const filePath = await familyModel.generateListFile(req.user.cityId);
    res.sendFile(filePath);
  } catch (error) {
    logging.error(error);
    res.status(500).send(error.message);
  }
});

export default router;
