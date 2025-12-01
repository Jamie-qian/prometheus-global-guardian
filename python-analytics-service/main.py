#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Prometheus Global Guardian - Python Analytics Service
高性能数据分析微服务，替代TypeScript统计算法实现
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import logging

from analytics.statistical_algorithms import StatisticalAnalyzer
from analytics.prediction_models import PredictionEngine
from analytics.etl_processor import ETLProcessor
from analytics.risk_assessment import RiskAssessor

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 初始化FastAPI应用
app = FastAPI(
    title="Prometheus Analytics Service",
    description="Python-powered data analytics microservice for hazard monitoring",
    version="1.0.0"
)

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 数据模型定义
class HazardData(BaseModel):
    id: str
    type: str
    title: str
    coordinates: List[float]
    timestamp: str
    magnitude: Optional[float] = None
    severity: Optional[str] = None
    source: str
    populationExposed: Optional[int] = None

class AnalysisRequest(BaseModel):
    hazards: List[HazardData]
    analysisType: str = "comprehensive"
    timeRange: int = 30  # days

class AnalysisResponse(BaseModel):
    success: bool
    data: Dict[str, Any]
    processingTime: float
    timestamp: str

# 初始化分析引擎
statistical_analyzer = StatisticalAnalyzer()
prediction_engine = PredictionEngine()
etl_processor = ETLProcessor()
risk_assessor = RiskAssessor()

@app.get("/")
async def root():
    return {
        "service": "Prometheus Analytics Service", 
        "status": "running",
        "version": "1.0.0",
        "features": [
            "23 Statistical Algorithms",
            "5 Prediction Models", 
            "ETL Processing",
            "Risk Assessment"
        ]
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.post("/api/v1/analyze", response_model=AnalysisResponse)
async def comprehensive_analysis(request: AnalysisRequest):
    """综合数据分析接口 - 替代TypeScript的23种统计算法"""
    start_time = datetime.now()
    
    try:
        # 转换数据格式
        df = etl_processor.convert_to_dataframe([hazard.dict() for hazard in request.hazards])
        
        # 执行统计分析
        statistical_results = statistical_analyzer.run_comprehensive_analysis(df)
        
        # 执行预测分析
        prediction_results = prediction_engine.generate_predictions(df)
        
        # 风险评估
        risk_results = risk_assessor.calculate_comprehensive_risk(df)
        
        # 组合结果
        analysis_data = {
            "statistics": statistical_results,
            "predictions": prediction_results,
            "riskAssessment": risk_results,
            "dataQuality": etl_processor.assess_data_quality(df),
            "processingInfo": {
                "totalRecords": len(df),
                "timeRange": request.timeRange,
                "analysisType": request.analysisType
            }
        }
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return AnalysisResponse(
            success=True,
            data=analysis_data,
            processingTime=processing_time,
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.post("/api/v1/statistics")
async def statistical_analysis(request: AnalysisRequest):
    """专门的统计分析接口 - 23种算法"""
    try:
        df = etl_processor.convert_to_dataframe([hazard.dict() for hazard in request.hazards])
        results = statistical_analyzer.run_comprehensive_analysis(df)
        return {"success": True, "data": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/predictions")
async def prediction_analysis(request: AnalysisRequest):
    """专门的预测分析接口 - 5个回归模型"""
    try:
        df = etl_processor.convert_to_dataframe([hazard.dict() for hazard in request.hazards])
        results = prediction_engine.generate_predictions(df)
        return {"success": True, "data": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/etl/process")
async def etl_processing(request: AnalysisRequest):
    """ETL数据处理接口"""
    try:
        df = etl_processor.convert_to_dataframe([hazard.dict() for hazard in request.hazards])
        processed_data = etl_processor.process_data(df)
        quality_metrics = etl_processor.assess_data_quality(df)
        
        return {
            "success": True, 
            "data": {
                "processedData": processed_data.to_dict('records'),
                "qualityMetrics": quality_metrics
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/risk-assessment")
async def risk_assessment(request: AnalysisRequest):
    """风险评估接口"""
    try:
        df = etl_processor.convert_to_dataframe([hazard.dict() for hazard in request.hazards])
        risk_results = risk_assessor.calculate_comprehensive_risk(df)
        return {"success": True, "data": risk_results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app", 
        host="0.0.0.0", 
        port=8001, 
        reload=True,
        log_level="info"
    )
