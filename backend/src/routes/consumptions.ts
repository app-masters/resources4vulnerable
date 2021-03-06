import express from 'express';
import logging from '../utils/logging';
import * as consumptionModel from '../models/consumptions';
import { uploadFile } from '../utils/file';

const router = express.Router({ mergeParams: true });

const consumptionType = process.env.CONSUMPTION_TYPE as 'ticket' | 'product';

/**
 * Create new consumption for the placeStore the logged user
 */
router.post('/', async (req, res) => {
  try {
    let proofImageUrl: string | null = null;
    // Check if there is a image in the request
    if (req.body.products) req.body.products = JSON.parse(req.body.products);

    if (req.files && Object.keys(req.files).length !== 0) {
      let image = req.files.image;
      if (Array.isArray(image)) {
        image = image[0];
      }
      const data = await uploadFile(`image`, `consumption-${new Date().getTime()}`, image);
      if (!data) {
        throw { message: `Failed to upload image to the store` };
      } else {
        proofImageUrl = data.url;
      }
    }

    let item;
    if (consumptionType === 'ticket') {
      item = await consumptionModel.addConsumption({ ...req.body, proofImageUrl });
      // Scrape the purchase data, but don't wait for it
      consumptionModel.scrapeConsumption(item);
      return res.send(item);
    } else {
      item = await consumptionModel.addConsumptionProduct({ ...req.body, proofImageUrl });
      return res.send(item);
    }
  } catch (error) {
    if (!error.status || Number(error.status) !== 409) {
      logging.error(error.message || error, { error, body: req.body });
    }
    return res.status(error.status || 500).send(error.message);
  }
});

/**
 * Upload image
 */
router.post('/image', async (req, res) => {
  try {
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).send('No files were uploaded.');
    }
    let image = req.files.image;
    if (Array.isArray(image)) {
      image = image[0];
    }
    const data = await uploadFile(`image`, `consumption-${new Date().getTime()}`, image);
    return res.send(data);
  } catch (error) {
    logging.error(error);
    return res.status(error.status || 500).send(error.message);
  }
});

/**
 * Report
 */
router.get('/report', async (req, res) => {
  try {
    if (!req.user?.cityId) throw Error('User without selected store creating consumption');
    let data;
    if (req.user.placeStoreId) {
      data = await consumptionModel.getPlaceConsumptionsReport(
        req.query.minDate as string,
        req.query.maxDate as string,
        undefined,
        req.user.placeStoreId as string
      );
    } else {
      data = await consumptionModel.getPlaceConsumptionsReport(
        req.query.minDate as string,
        req.query.maxDate as string,
        req.query.placeId as string,
        req.query.placeStoreId as string
      );
    }

    return res.send(data);
  } catch (error) {
    logging.error(error);
    return res.status(error.status || 500).send(error.message);
  }
});

/**
 * Report family
 */
router.get('/report-family', async (req, res) => {
  try {
    if (!req.user?.cityId) throw Error('User without selected store creating consumption');
    const filters = {
      rangeFamily: req.query.rangeFamily ? JSON.parse(req.query.rangeFamily as string) : undefined,
      rangeConsumption: req.query.rangeConsumption ? JSON.parse(req.query.rangeConsumption as string) : undefined,
      memberCpf: req.query.memberCpf as string,
      onlyWithoutConsumption: !!req.query.onlyWithoutConsumption
    };
    const report = await consumptionModel.getConsumptionFamilyReport(
      filters.rangeFamily,
      filters.rangeConsumption,
      filters.memberCpf,
      filters.onlyWithoutConsumption
    );
    return res.send(report);
  } catch (error) {
    logging.error(error);
    return res.status(error.status || 500).send(error.message);
  }
});

/**
 * Report placeStore
 */
router.get('/report-placestore', async (req, res) => {
  try {
    // if (!req.user?.cityId) throw Error('User without selected store creating consumption');
    const filters = {
      rangeConsumption: req.query.rangeConsumption ? JSON.parse(req.query.rangeConsumption as string) : undefined
    };
    const report = await consumptionModel.getConsumptionPlaceStoreReport(filters.rangeConsumption);
    return res.send(report);
  } catch (error) {
    logging.error(error);
    return res.status(error.status || 500).send(error.message);
  }
});

router.post('/report-ticket', async (req, res) => {
  try {
    if (!req.user?.cityId) throw Error('User without selected city');
    // Check files
    if (!req.files || !req.files.file) {
      return res.status(400).send('No files were uploaded.');
    }
    let file = req.files.file;
    if (Array.isArray(file)) {
      file = file[0];
    }

    // Run the import function, the status will be monitored using the report function/route
    const filePath = await consumptionModel.generateTicketReport(
      file.tempFilePath,
      req.user.cityId,
      req.query.start as string,
      req.query.end as string
    );
    return res.sendFile(filePath);
  } catch (error) {
    logging.error(error);
    return res.status(500).send(error.message);
  }
});

router.post('/delete/:id', async (req, res) => {
  try {
    if (!req.user?.cityId) throw Error('User without selected city');

    await consumptionModel.deleteById(req.params.id, req.body.reason, req.user);
    return res.send({ deleted: true });
  } catch (error) {
    logging.error(error);
    return res.status(500).send(error.message);
  }
});

export default router;
