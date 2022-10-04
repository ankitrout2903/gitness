// Copyright 2021 Harness Inc. All rights reserved.
// Use of this source code is governed by the Polyform Free Trial License
// that can be found in the LICENSE.md file for this repository.

package space

import (
	"context"
	"fmt"
	"strings"
	"time"

	apiauth "github.com/harness/gitness/internal/api/auth"
	"github.com/harness/gitness/internal/api/usererror"
	"github.com/harness/gitness/internal/auth"
	"github.com/harness/gitness/internal/paths"
	"github.com/harness/gitness/types"
	"github.com/harness/gitness/types/check"
	"github.com/harness/gitness/types/enum"
)

type CreateInput struct {
	PathName    string `json:"pathName"`
	ParentID    int64  `json:"parentId"`
	Name        string `json:"name"`
	Description string `json:"description"`
	IsPublic    bool   `json:"isPublic"`
}

/*
 * Create creates a new space.
 */
func (c *Controller) Create(ctx context.Context, session *auth.Session, in *CreateInput) (*types.Space, error) {
	// Collect parent path along the way - needed for duplicate error message
	parentPath := ""

	/*
	 * AUTHORIZATION
	 * Can only be done once we know the parent space
	 */
	if in.ParentID <= 0 {
		// TODO: Restrict top level space creation.
		if session == nil {
			return nil, usererror.ErrUnauthorized
		}
	} else {
		// Create is a special case - we need the parent path
		var parent *types.Space
		parent, err := c.spaceStore.Find(ctx, in.ParentID)
		if err != nil {
			return nil, fmt.Errorf("failed to get parent space: %w", err)
		}

		scope := &types.Scope{SpacePath: parent.Path}
		resource := &types.Resource{
			Type: enum.ResourceTypeSpace,
			Name: "",
		}
		if err = apiauth.Check(ctx, c.authorizer, session, scope, resource, enum.PermissionSpaceCreate); err != nil {
			return nil, err
		}

		parentPath = parent.Path
	}

	// create new space object
	space := &types.Space{
		PathName:    strings.ToLower(in.PathName),
		ParentID:    in.ParentID,
		Name:        in.Name,
		Description: in.Description,
		IsPublic:    in.IsPublic,
		CreatedBy:   session.Principal.ID,
		Created:     time.Now().UnixMilli(),
		Updated:     time.Now().UnixMilli(),
	}

	// validate space
	if err := check.Space(space); err != nil {
		return nil, err
	}

	// Validate path length (Due to racing conditions we can't be 100% sure on the path here only best effort
	// to have a quick failure)
	path := paths.Concatinate(parentPath, space.PathName)
	if err := check.Path(path, true); err != nil {
		return nil, err
	}

	// create in store
	err := c.spaceStore.Create(ctx, space)
	if err != nil {
		return nil, fmt.Errorf("space creation failed: %w", err)
	}

	return space, nil
}
