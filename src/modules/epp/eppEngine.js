/**
 * TalentTrack EPP & Industrial Safety Engine (Res. SRT 299/11)
 * Evaluates mandatory protective gear by position, compliance rate,
 * and renewal expirations for the 30/15/7 alert traffic light.
 */

import { EPP_CATALOG } from '../../state/initialData.js';
import { ExpirationEngine } from '../compliance/expirationEngine.js';

export class EppEngine {
  /**
   * Evaluates an employee's EPP compliance against their position requirements.
   * @param {Object} employee 
   * @param {Array} deliveries 
   * @param {Array} positionRequirements 
   * @returns {Object}
   */
  static evaluateEmployeeEppStatus(employee, deliveries = [], positionRequirements = []) {
    if (!employee) return { complianceRate: 100, isCompliant: true, required: [], missing: [], fulfilled: [], expired: [] };

    // Buscar requisitos de puesto con fallback seguro
    const reqs = Array.isArray(positionRequirements) ? positionRequirements : [];
    const posReq = reqs.find(r => (r.role || '').toLowerCase() === (employee.role || '').toLowerCase()) || {};
    const mandatoryEppIds = posReq.mandatoryEpp || [];

    if (mandatoryEppIds.length === 0) {
      return {
        complianceRate: 100,
        isCompliant: true,
        required: [],
        missing: [],
        fulfilled: [],
        expired: []
      };
    }

    const empDeliveries = deliveries.filter(d => d.employeeId === employee.id);

    const fulfilled = [];
    const missing = [];
    const expired = [];

    mandatoryEppIds.forEach(eppId => {
      const catalogItem = EPP_CATALOG[eppId] || { name: eppId, standard: 'Sello S / IRAM', icon: '🦺' };
      // Buscar la entrega más reciente para este EPP
      const matchingDeliveries = empDeliveries
        .filter(d => d.eppId === eppId)
        .sort((a, b) => new Date(b.deliveryDate) - new Date(a.deliveryDate));

      if (matchingDeliveries.length === 0) {
        missing.push({
          eppId,
          name: catalogItem.name,
          standard: catalogItem.standard,
          icon: catalogItem.icon,
          reason: 'Nunca entregado'
        });
      } else {
        const latest = matchingDeliveries[0];
        const evalExp = latest.expirationDate ? ExpirationEngine.evaluateDate(latest.expirationDate) : null;
        
        if (evalExp && evalExp.status.code === 'EXPIRED') {
          expired.push({
            eppId,
            name: catalogItem.name,
            standard: catalogItem.standard,
            icon: catalogItem.icon,
            latestDelivery: latest,
            eval: evalExp
          });
        } else {
          fulfilled.push({
            eppId,
            name: catalogItem.name,
            standard: catalogItem.standard,
            icon: catalogItem.icon,
            latestDelivery: latest,
            eval: evalExp
          });
        }
      }
    });

    const isCompliant = missing.length === 0 && expired.length === 0;
    const rate = Math.round((fulfilled.length / mandatoryEppIds.length) * 100);

    return {
      complianceRate: rate,
      isCompliant,
      requiredCount: mandatoryEppIds.length,
      fulfilledCount: fulfilled.length,
      missingCount: missing.length,
      expiredCount: expired.length,
      required: mandatoryEppIds,
      fulfilled,
      missing,
      expired
    };
  }

  /**
   * Converts active EPP deliveries into credential-like objects
   * so they seamlessly integrate with ExpirationEngine scans and WhatsApp alerts.
   * @param {Array} deliveries 
   * @param {Array} employees 
   * @returns {Array}
   */
  static scanEppAlerts(deliveries = [], employees = []) {
    const alerts = [];
    const empMap = new Map((employees || []).map(e => [e.id, e]));

    deliveries.forEach(del => {
      if (!del.expirationDate) return;

      const evalRes = ExpirationEngine.evaluateDate(del.expirationDate);
      if (evalRes.status.code === 'NOT_APPLICABLE' || evalRes.status.code === 'VALID') return;

      const emp = empMap.get(del.employeeId);
      alerts.push({
        employeeId: del.employeeId,
        employeeName: del.employeeName || (emp ? `${emp.firstName} ${emp.lastName}` : 'Colaborador'),
        employeeRole: emp ? emp.role : 'Operativo',
        employeePhone: emp ? emp.phone : '',
        credentialId: del.id,
        credentialType: 'EPP_RENEWAL',
        credentialLabel: `Recambio EPP: ${del.eppName}`,
        credentialNumber: del.brandModel,
        categories: [del.standard],
        expirationDate: del.expirationDate,
        formattedDate: evalRes.formattedDate,
        daysRemaining: evalRes.daysRemaining,
        status: evalRes.status,
        isEpp: true
      });
    });

    return alerts.sort((a, b) => a.status.daysRemaining - b.status.daysRemaining);
  }

  /**
   * Formats a delivery record according to official SRT 299/11 row standards.
   * @param {Object} delivery 
   * @param {Object} employee 
   * @param {Object} company 
   * @returns {Object}
   */
  static formatSrt299Record(delivery, employee, company) {
    return {
      razonSocial: company?.name || '',
      cuit: company?.cuit || '',
      colaborador: delivery.employeeName || `${employee?.firstName || ''} ${employee?.lastName || ''}`,
      dni: delivery.dni || employee?.dni || '',
      puesto: employee?.role || 'Operativo',
      elemento: delivery.eppName,
      tipoModelo: delivery.brandModel || 'Estándar',
      certificacion: delivery.standard || 'Sello S / IRAM',
      cantidad: delivery.quantity || 1,
      fechaEntrega: delivery.deliveryDate,
      fechaVencimiento: delivery.expirationDate || 'N/A',
      capacitado: delivery.trainedInUse ? 'SÍ' : 'NO',
      firmado: delivery.signature ? 'SÍ' : 'NO',
      firmaHash: delivery.signatureHash || 'PENDIENTE',
      responsable: delivery.deliveredBy || 'Higiene y Seguridad'
    };
  }
}
