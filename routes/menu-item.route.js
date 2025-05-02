

import express from "express";
import {createMenuItem , deleteMenuItem , getAllMenuItems , getMenuItemDetails , getMenuItemsByCategory ,getMenuItemsByDietary , getMenuItemsByHealth , getPopularMenuItems , searchMenuItems , updateMenuItem  } from "../controllers/menu-item.controller.js";
import { isAdmin } from "../middlewares/auth.middleware.js";

import { authenticate } from '../controllers/auth.controller.js';


const router = express.Router();


router.get("/", getAllMenuItems);
router.get("/popular", getPopularMenuItems);
router.get("/search", searchMenuItems);
router.get("/category/:categoryName", getMenuItemsByCategory);
router.get("/dietary/:preference", getMenuItemsByDietary);
router.get("/health/:preference", getMenuItemsByHealth);
router.get("/:itemId", getMenuItemDetails);


router.post(
    "/",
    authenticate, 
    isAdmin,      
    createMenuItem
);

router.put(
    "/:itemId",
    authenticate, 
    isAdmin,      
    updateMenuItem
);

router.delete(
    "/:itemId",
    authenticate, // 1. Run authentication FIRST
    isAdmin,      // 2. Run admin check SECOND
    deleteMenuItem
);

export default router;