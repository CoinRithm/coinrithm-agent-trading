from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="PublicPmEventRevisionEvidence")


@_attrs_define
class PublicPmEventRevisionEvidence:
    """Provenance for this correction. runId and captureId are null for
    watch-lane resolution changes, which re-fetch a single event by id
    rather than deriving from a daily sweep capture.

        Attributes:
            run_id (int | None | Unset):
            capture_id (int | None | Unset):
            parser_version (None | str | Unset):
            matcher_version (None | str | Unset):
            build_sha (None | str | Unset):
    """

    run_id: int | None | Unset = UNSET
    capture_id: int | None | Unset = UNSET
    parser_version: None | str | Unset = UNSET
    matcher_version: None | str | Unset = UNSET
    build_sha: None | str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        run_id: int | None | Unset
        if isinstance(self.run_id, Unset):
            run_id = UNSET
        else:
            run_id = self.run_id

        capture_id: int | None | Unset
        if isinstance(self.capture_id, Unset):
            capture_id = UNSET
        else:
            capture_id = self.capture_id

        parser_version: None | str | Unset
        if isinstance(self.parser_version, Unset):
            parser_version = UNSET
        else:
            parser_version = self.parser_version

        matcher_version: None | str | Unset
        if isinstance(self.matcher_version, Unset):
            matcher_version = UNSET
        else:
            matcher_version = self.matcher_version

        build_sha: None | str | Unset
        if isinstance(self.build_sha, Unset):
            build_sha = UNSET
        else:
            build_sha = self.build_sha

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if run_id is not UNSET:
            field_dict["runId"] = run_id
        if capture_id is not UNSET:
            field_dict["captureId"] = capture_id
        if parser_version is not UNSET:
            field_dict["parserVersion"] = parser_version
        if matcher_version is not UNSET:
            field_dict["matcherVersion"] = matcher_version
        if build_sha is not UNSET:
            field_dict["buildSha"] = build_sha

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)

        def _parse_run_id(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        run_id = _parse_run_id(d.pop("runId", UNSET))

        def _parse_capture_id(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        capture_id = _parse_capture_id(d.pop("captureId", UNSET))

        def _parse_parser_version(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        parser_version = _parse_parser_version(d.pop("parserVersion", UNSET))

        def _parse_matcher_version(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        matcher_version = _parse_matcher_version(d.pop("matcherVersion", UNSET))

        def _parse_build_sha(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        build_sha = _parse_build_sha(d.pop("buildSha", UNSET))

        public_pm_event_revision_evidence = cls(
            run_id=run_id,
            capture_id=capture_id,
            parser_version=parser_version,
            matcher_version=matcher_version,
            build_sha=build_sha,
        )

        public_pm_event_revision_evidence.additional_properties = d
        return public_pm_event_revision_evidence

    @property
    def additional_keys(self) -> list[str]:
        return list(self.additional_properties.keys())

    def __getitem__(self, key: str) -> Any:
        return self.additional_properties[key]

    def __setitem__(self, key: str, value: Any) -> None:
        self.additional_properties[key] = value

    def __delitem__(self, key: str) -> None:
        del self.additional_properties[key]

    def __contains__(self, key: str) -> bool:
        return key in self.additional_properties
