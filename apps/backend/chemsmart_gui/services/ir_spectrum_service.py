"""Generate display-ready IR spectrum previews from document metadata."""

from math import exp

from chemsmart_gui.domain.document import MoleculeDocument
from chemsmart_gui.domain.spectrum import (
    BroadenedIrSpectrumRequest,
    BroadenedIrSpectrumResponse,
    IrSpectrumBroadening,
    IrSpectrumPeak,
    IrSpectrumPoint,
)


def _ir_peaks_for_document(document: MoleculeDocument) -> list[IrSpectrumPeak]:
    peaks: list[IrSpectrumPeak] = []
    for mode in document.vibrational_modes:
        intensity = mode.ir_intensity_km_per_mol
        if intensity is None or intensity <= 0:
            continue
        peaks.append(
            IrSpectrumPeak(
                mode_index=mode.index,
                frequency_cm_minus_1=mode.frequency_cm_minus_1,
                ir_intensity_km_per_mol=intensity,
            )
        )
    return peaks


def _broadened_intensity(
    *,
    broadening: IrSpectrumBroadening,
    peak: IrSpectrumPeak,
    wavenumber_cm_minus_1: float,
    width_cm_minus_1: float,
) -> float:
    scaled_distance = (
        wavenumber_cm_minus_1 - peak.frequency_cm_minus_1
    ) / width_cm_minus_1
    if broadening == "gaussian":
        return peak.ir_intensity_km_per_mol * exp(
            -0.5 * scaled_distance * scaled_distance
        )
    if broadening == "lorentzian":
        return peak.ir_intensity_km_per_mol / (
            1.0 + scaled_distance * scaled_distance
        )

    raise ValueError(f"Unsupported IR broadening: {broadening}.")


class IrSpectrumService:
    """Build broadened IR spectrum points from normalized mode data."""

    def preview_broadened_ir_spectrum(
        self,
        request: BroadenedIrSpectrumRequest,
    ) -> BroadenedIrSpectrumResponse:
        peaks = _ir_peaks_for_document(request.document)
        if not peaks:
            raise ValueError(
                "No positive ir_intensity_km_per_mol values are available "
                "for IR spectrum broadening."
            )

        frequencies = [peak.frequency_cm_minus_1 for peak in peaks]
        padding = max(request.width_cm_minus_1 * 5.0, 50.0)
        start = min(frequencies) - padding
        stop = max(frequencies) + padding
        step = (stop - start) / (request.point_count - 1)
        points = [
            self._spectrum_point(
                request=request,
                peaks=peaks,
                wavenumber_cm_minus_1=start + step * point_index,
            )
            for point_index in range(request.point_count)
        ]

        return BroadenedIrSpectrumResponse(
            broadening=request.broadening,
            width_cm_minus_1=request.width_cm_minus_1,
            point_count=request.point_count,
            peaks=peaks,
            points=points,
        )

    @staticmethod
    def _spectrum_point(
        *,
        request: BroadenedIrSpectrumRequest,
        peaks: list[IrSpectrumPeak],
        wavenumber_cm_minus_1: float,
    ) -> IrSpectrumPoint:
        return IrSpectrumPoint(
            wavenumber_cm_minus_1=wavenumber_cm_minus_1,
            intensity_km_per_mol=sum(
                _broadened_intensity(
                    broadening=request.broadening,
                    peak=peak,
                    wavenumber_cm_minus_1=wavenumber_cm_minus_1,
                    width_cm_minus_1=request.width_cm_minus_1,
                )
                for peak in peaks
            ),
        )
